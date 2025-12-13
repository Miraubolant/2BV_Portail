import { Head, Link, router } from '@inertiajs/react'
import { getAdminLayout, useBreadcrumb } from '@/components/layout/admin-layout'
import { ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ADMIN_DOSSIERS_API, ADMIN_FAVORIS_API, formatDate, API_BASE_URL } from '@/lib/constants'
import { emitFavorisUpdated } from '@/hooks/use-favoris'
import { DossierTimeline } from '@/components/admin/dossier-timeline'
import { DossierNotes } from '@/components/admin/dossier-notes'
import { DossierTasks } from '@/components/admin/dossier-tasks'
import { ADMIN_DOSSIERS } from '@/app/routes'
import { useEffect, useState, useRef, useCallback, memo } from 'react'
import {
  ArrowLeft,
  Edit,
  FileText,
  User,
  LoaderCircle,
  Plus,
  Save,
  Calendar,
  Gavel,
  Info,
  StickyNote,
  Download,
  Eye,
  MoreVertical,
  Trash2,
  Upload,
  X,
  File,
  Image,
  FileSpreadsheet,
  Star,
  Folder,
  Building2,
  UserCircle,
} from 'lucide-react'
import { Document as PDFDocument, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface DocumentType {
  id: string
  nom: string
  nomOriginal: string | null
  typeDocument: string | null
  tailleOctets: number | null
  mimeType: string | null
  extension: string | null
  sensible: boolean
  visibleClient: boolean
  createdAt: string
  onedriveFileId: string | null
  dossierLocation: 'cabinet' | 'client'
  uploadedByClient: boolean
}

interface Dossier {
  id: string
  reference: string
  intitule: string
  description: string | null
  statut: string
  typeAffaire: string | null
  dateOuverture: string | null
  dateCloture: string | null
  honorairesEstimes: number | null
  honorairesFactures: number | null
  juridiction: string | null
  numeroRg: string | null
  adversaireNom: string | null
  adversaireAvocat: string | null
  notesInternes: string | null
  createdAt: string
  client: {
    id: string
    nom: string
    prenom: string
    email: string
  }
  documents?: DocumentType[]
}

const statutLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  nouveau: { label: 'Nouveau', variant: 'default' },
  en_cours: { label: 'En cours', variant: 'secondary' },
  en_attente: { label: 'En attente', variant: 'outline' },
  audience_prevue: { label: 'Audience prevue', variant: 'secondary' },
  en_delibere: { label: 'En delibere', variant: 'outline' },
  cloture_gagne: { label: 'Gagne', variant: 'default' },
  cloture_perdu: { label: 'Perdu', variant: 'destructive' },
  cloture_transaction: { label: 'Transaction', variant: 'secondary' },
  archive: { label: 'Archive', variant: 'outline' },
}

const typeDocumentLabels: Record<string, string> = {
  piece_procedure: 'Piece de procedure',
  correspondance: 'Correspondance',
  facture: 'Facture',
  contrat: 'Contrat',
  decision: 'Decision de justice',
  photo: 'Photo/Image',
  autre: 'Autre',
}

// Utility functions
const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-'
  const units = ['o', 'Ko', 'Mo', 'Go']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

const getFileType = (mimeType: string | null, extension: string | null): 'pdf' | 'image' | 'excel' | 'word' | 'other' => {
  const ext = extension?.toLowerCase() || ''
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel'
  if (['doc', 'docx'].includes(ext)) return 'word'
  return 'other'
}

const getFileIconConfig = (fileType: 'pdf' | 'image' | 'excel' | 'word' | 'other') => {
  switch (fileType) {
    case 'image':
      return { icon: Image, color: 'text-green-500', bg: 'bg-green-50' }
    case 'pdf':
      return { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' }
    case 'excel':
      return { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50' }
    case 'word':
      return { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' }
    default:
      return { icon: File, color: 'text-gray-500', bg: 'bg-gray-50' }
  }
}

// Document Thumbnail Component
const DocumentThumbnail = memo(({ doc, onClick }: { doc: DocumentType; onClick: () => void }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fileType = getFileType(doc.mimeType, doc.extension)
  const iconConfig = getFileIconConfig(fileType)
  const IconComponent = iconConfig.icon

  useEffect(() => {
    if (!doc.onedriveFileId) {
      setLoading(false)
      return
    }

    const loadThumbnail = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}admin/documents/${doc.id}/thumbnail?size=medium`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setThumbnailUrl(data.url)
        }
      } catch {
        // Thumbnail not available
      } finally {
        setLoading(false)
      }
    }

    loadThumbnail()
  }, [doc.id, doc.onedriveFileId])

  const canPreview = fileType === 'pdf' || fileType === 'image'

  return (
    <button
      onClick={canPreview ? onClick : undefined}
      disabled={!canPreview}
      className={`relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-muted border-2 border-transparent transition-all ${
        canPreview ? 'hover:border-primary hover:shadow-md cursor-pointer' : 'cursor-default'
      }`}
    >
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={doc.nom}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center ${iconConfig.bg}`}>
          <IconComponent className={`h-12 w-12 ${iconConfig.color}`} />
        </div>
      )}
      {canPreview && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
          <Eye className="h-8 w-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
        </div>
      )}
    </button>
  )
})

DocumentThumbnail.displayName = 'DocumentThumbnail'

// PDF Viewer Component
const PDFViewer = memo(({ url }: { url: string }) => {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            Precedent
          </Button>
          <span className="text-sm px-2">
            Page {pageNumber} / {numPages || '?'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageNumber((p) => Math.min(numPages || p, p + 1))}
            disabled={!numPages || pageNumber >= numPages}
          >
            Suivant
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
          >
            -
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScale((s) => Math.min(2, s + 0.2))}
          >
            +
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex justify-center p-4 bg-gray-100">
        <PDFDocument
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-8">
              <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
          error={
            <div className="text-center p-8 text-destructive">
              Erreur lors du chargement du PDF
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </PDFDocument>
      </div>
    </div>
  )
})

PDFViewer.displayName = 'PDFViewer'

// Main Component
const DossierShowPage = () => {
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<Dossier>>({})
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || 'documents'
  })

  // Document modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [editDocModalOpen, setEditDocModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadForm, setUploadForm] = useState({
    nom: '',
    typeDocument: 'autre',
    location: 'cabinet' as 'cabinet' | 'client',
    visibleClient: false,
    sensible: false,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit document state
  const [editDocForm, setEditDocForm] = useState({
    nom: '',
    typeDocument: '',
    visibleClient: true,
    sensible: false,
  })
  const [savingDoc, setSavingDoc] = useState(false)
  const [deletingDoc, setDeletingDoc] = useState(false)

  // Favoris
  const [isFavorite, setIsFavorite] = useState(false)
  const [togglingFavorite, setTogglingFavorite] = useState(false)

  // Delete dossier
  const [deleteDossierConfirmOpen, setDeleteDossierConfirmOpen] = useState(false)
  const [deletingDossier, setDeletingDossier] = useState(false)

  const dossierId = window.location.pathname.split('/').pop()

  // Breadcrumb dynamique
  const { setBreadcrumbs, clearBreadcrumbs } = useBreadcrumb()

  useEffect(() => {
    fetchDossier()
    checkFavorite()
  }, [dossierId])

  // Mettre a jour le breadcrumb quand le dossier est charge
  useEffect(() => {
    if (dossier) {
      setBreadcrumbs([
        { label: 'Dossiers', href: ADMIN_DOSSIERS },
        { label: dossier.reference },
      ])
    }
    // Nettoyer le breadcrumb quand on quitte la page
    return () => {
      clearBreadcrumbs()
    }
  }, [dossier, setBreadcrumbs, clearBreadcrumbs])

  const checkFavorite = async () => {
    if (!dossierId) return
    try {
      const response = await fetch(`${ADMIN_FAVORIS_API}/check?type=dossier&id=${dossierId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setIsFavorite(result.isFavorite)
      }
    } catch (error) {
      console.error('Error checking favorite:', error)
    }
  }

  const toggleFavorite = async () => {
    if (!dossierId) return
    setTogglingFavorite(true)
    try {
      const response = await fetch(`${ADMIN_FAVORIS_API}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'dossier', id: dossierId }),
      })
      if (response.ok) {
        const result = await response.json()
        setIsFavorite(result.isFavorite)
        emitFavorisUpdated()
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    } finally {
      setTogglingFavorite(false)
    }
  }

  const fetchDossier = async () => {
    try {
      const response = await fetch(`${ADMIN_DOSSIERS_API}/${dossierId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setDossier(result)
        setFormData(result)
      }
    } catch (error) {
      console.error('Error fetching dossier:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${ADMIN_DOSSIERS_API}/${dossierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        const updated = await response.json()
        setDossier(updated)
        setEditMode(false)
      }
    } catch (error) {
      console.error('Error updating dossier:', error)
    } finally {
      setSaving(false)
    }
  }

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      setUploadForm((prev) => ({
        ...prev,
        nom: file.name.replace(/\.[^/.]+$/, ''),
      }))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setUploadFile(file)
      setUploadForm((prev) => ({
        ...prev,
        nom: file.name.replace(/\.[^/.]+$/, ''),
      }))
    }
  }, [])

  const handleUpload = async () => {
    if (!uploadFile || !dossierId) return

    setUploading(true)
    try {
      const formDataObj = new FormData()
      formDataObj.append('file', uploadFile)
      formDataObj.append('nom', uploadForm.nom)
      formDataObj.append('typeDocument', uploadForm.typeDocument)
      formDataObj.append('location', uploadForm.location)
      formDataObj.append('visibleClient', String(uploadForm.visibleClient))
      formDataObj.append('sensible', String(uploadForm.sensible))

      const response = await fetch(`${API_BASE_URL}admin/dossiers/${dossierId}/documents/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formDataObj,
      })

      if (response.ok) {
        const newDocument = await response.json()
        // Add document directly to state for instant update
        setDossier((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            documents: [newDocument, ...(prev.documents || [])],
          }
        })
        setUploadModalOpen(false)
        setUploadFile(null)
        setUploadForm({ nom: '', typeDocument: 'autre', location: 'cabinet', visibleClient: false, sensible: false })
      } else {
        const error = await response.json()
        alert(error.message || "Erreur lors de l'upload")
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert("Erreur lors de l'upload")
    } finally {
      setUploading(false)
    }
  }

  // Download handler
  const handleDownload = async (doc: DocumentType) => {
    try {
      const response = await fetch(`${API_BASE_URL}admin/documents/${doc.id}/download`, {
        credentials: 'include',
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = doc.nom + (doc.extension ? `.${doc.extension}` : '')
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  // Preview handler
  const handlePreview = async (doc: DocumentType) => {
    setSelectedDoc(doc)
    setPreviewLoading(true)
    setPreviewModalOpen(true)

    try {
      const response = await fetch(`${API_BASE_URL}admin/documents/${doc.id}/url`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewUrl(data.url)
      }
    } catch (error) {
      console.error('Error getting preview URL:', error)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewModalOpen(false)
    setSelectedDoc(null)
    setPreviewUrl(null)
  }

  // Edit document handler
  const openEditDocModal = (doc: DocumentType) => {
    setSelectedDoc(doc)
    setEditDocForm({
      nom: doc.nom,
      typeDocument: doc.typeDocument || 'autre',
      visibleClient: doc.visibleClient,
      sensible: doc.sensible,
    })
    setEditDocModalOpen(true)
  }

  const handleSaveDoc = async () => {
    if (!selectedDoc) return

    setSavingDoc(true)
    try {
      const response = await fetch(`${API_BASE_URL}admin/documents/${selectedDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editDocForm),
      })

      if (response.ok) {
        await fetchDossier()
        setEditDocModalOpen(false)
        setSelectedDoc(null)
      }
    } catch (error) {
      console.error('Error updating document:', error)
    } finally {
      setSavingDoc(false)
    }
  }

  // Delete document handler
  const handleDeleteDoc = async () => {
    if (!selectedDoc) return

    setDeletingDoc(true)
    try {
      const response = await fetch(`${API_BASE_URL}admin/documents/${selectedDoc.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        await fetchDossier()
        setDeleteConfirmOpen(false)
        setSelectedDoc(null)
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    } finally {
      setDeletingDoc(false)
    }
  }

  // Delete dossier handler
  const handleDeleteDossier = async () => {
    if (!dossierId) return

    setDeletingDossier(true)
    try {
      const response = await fetch(`${ADMIN_DOSSIERS_API}/${dossierId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Dossier supprime', {
          description: `Le dossier ${dossier?.reference} a ete supprime.`,
        })
        router.visit(ADMIN_DOSSIERS)
      } else {
        const error = await response.json()
        toast.error('Erreur lors de la suppression', {
          description: error.message || 'Une erreur est survenue',
        })
      }
    } catch (error) {
      console.error('Error deleting dossier:', error)
      toast.error('Erreur lors de la suppression', {
        description: 'Une erreur est survenue',
      })
    } finally {
      setDeletingDossier(false)
      setDeleteDossierConfirmOpen(false)
    }
  }

  if (loading) {
    return (
      <>
        <Head title="Dossier" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!dossier) {
    return (
      <>
        <Head title="Dossier non trouve" />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ce dossier n'existe pas</p>
          <Button variant="link" asChild>
            <Link href={ADMIN_DOSSIERS}>Retour a la liste</Link>
          </Button>
        </div>
      </>
    )
  }

  const statutConfig = statutLabels[dossier.statut] || { label: dossier.statut, variant: 'outline' }

  return (
    <>
      <Head title={dossier.reference} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href={ADMIN_DOSSIERS}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{dossier.reference}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleFavorite}
                  disabled={togglingFavorite}
                  className={isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-yellow-500'}
                  title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Star className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteDossierConfirmOpen(true)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Supprimer le dossier"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-muted-foreground">{dossier.intitule}</p>
              <div className="flex items-center gap-2 mt-1">
                <Select
                  value={dossier.statut}
                  onValueChange={async (value) => {
                    try {
                      const response = await fetch(`${ADMIN_DOSSIERS_API}/${dossierId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ statut: value }),
                      })
                      if (response.ok) {
                        const updated = await response.json()
                        setDossier(updated)
                      }
                    } catch (error) {
                      console.error('Error updating statut:', error)
                    }
                  }}
                >
                  <SelectTrigger className={`h-7 w-auto text-xs font-medium gap-1 ${
                    dossier.statut.startsWith('cloture_gagne') ? 'bg-primary text-primary-foreground' :
                    dossier.statut.startsWith('cloture_perdu') ? 'bg-destructive text-destructive-foreground' :
                    dossier.statut === 'archive' ? 'bg-muted text-muted-foreground' :
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statutLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {dossier.typeAffaire && <Badge variant="outline">{dossier.typeAffaire}</Badge>}
              </div>
            </div>
          </div>
          {activeTab === 'infos' && (
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false)
                      setFormData(dossier)
                    }}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              )}
            </div>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value)
            if (value !== 'infos') setEditMode(false)
          }}
        >
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="infos">Informations</TabsTrigger>
            <TabsTrigger value="timeline">Historique</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="tasks">Taches</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Header avec bouton ajouter */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Documents ({dossier.documents?.length || 0})
                </h2>
                <p className="text-sm text-muted-foreground">
                  Organisation OneDrive : CABINET (internes) / CLIENT (envoyes par le client)
                </p>
              </div>
              <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>

            {dossier.documents && dossier.documents.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Section CABINET */}
                <Card className="border-blue-200 dark:border-blue-900">
                  <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Dossier CABINET</CardTitle>
                        <CardDescription className="text-xs">
                          Documents internes ({dossier.documents.filter(d => d.dossierLocation === 'cabinet' || (!d.dossierLocation && !d.uploadedByClient)).length})
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {(() => {
                      const cabinetDocs = dossier.documents.filter(d => d.dossierLocation === 'cabinet' || (!d.dossierLocation && !d.uploadedByClient))
                      if (cabinetDocs.length === 0) {
                        return (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            Aucun document cabinet
                          </div>
                        )
                      }
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {cabinetDocs.map((doc) => (
                            <div key={doc.id} className="group">
                              <DocumentThumbnail doc={doc} onClick={() => handlePreview(doc)} />
                              <div className="mt-2 space-y-1">
                                <p className="font-medium text-xs truncate" title={doc.nom}>
                                  {doc.nom}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatFileSize(doc.tailleOctets)}
                                  </p>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {(getFileType(doc.mimeType, doc.extension) === 'pdf' ||
                                        getFileType(doc.mimeType, doc.extension) === 'image') && (
                                        <DropdownMenuItem onClick={() => handlePreview(doc)}>
                                          <Eye className="mr-2 h-4 w-4" />
                                          Apercu
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Telecharger
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditDocModal(doc)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Modifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => {
                                          setSelectedDoc(doc)
                                          setDeleteConfirmOpen(true)
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                  {doc.visibleClient ? (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-50 text-green-700 border-green-200">
                                      Visible client
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      Interne
                                    </Badge>
                                  )}
                                  {doc.sensible && (
                                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                      Sensible
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>

                {/* Section CLIENT */}
                <Card className="border-emerald-200 dark:border-emerald-900">
                  <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900">
                        <UserCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Dossier CLIENT</CardTitle>
                        <CardDescription className="text-xs">
                          Documents envoyes par le client ({dossier.documents.filter(d => d.dossierLocation === 'client' || (!d.dossierLocation && d.uploadedByClient)).length})
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {(() => {
                      const clientDocs = dossier.documents.filter(d => d.dossierLocation === 'client' || (!d.dossierLocation && d.uploadedByClient))
                      if (clientDocs.length === 0) {
                        return (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            <UserCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            Aucun document client
                          </div>
                        )
                      }
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {clientDocs.map((doc) => (
                            <div key={doc.id} className="group">
                              <DocumentThumbnail doc={doc} onClick={() => handlePreview(doc)} />
                              <div className="mt-2 space-y-1">
                                <p className="font-medium text-xs truncate" title={doc.nom}>
                                  {doc.nom}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatFileSize(doc.tailleOctets)}
                                  </p>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {(getFileType(doc.mimeType, doc.extension) === 'pdf' ||
                                        getFileType(doc.mimeType, doc.extension) === 'image') && (
                                        <DropdownMenuItem onClick={() => handlePreview(doc)}>
                                          <Eye className="mr-2 h-4 w-4" />
                                          Apercu
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Telecharger
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openEditDocModal(doc)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Modifier
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => {
                                          setSelectedDoc(doc)
                                          setDeleteConfirmOpen(true)
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Supprimer
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Du client
                                  </Badge>
                                  {doc.sensible && (
                                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                      Sensible
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun document</p>
                  <Button variant="outline" onClick={() => setUploadModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un document
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Informations Tab */}
          <TabsContent value="infos" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* General Info */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Info className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Informations generales</CardTitle>
                        <CardDescription>Details principaux du dossier</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Intitule
                          </Label>
                          <Input
                            value={formData.intitule || ''}
                            onChange={(e) => setFormData({ ...formData, intitule: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Statut
                          </Label>
                          <Select
                            value={formData.statut || ''}
                            onValueChange={(v) => setFormData({ ...formData, statut: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statutLabels).map(([key, { label }]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Type d'affaire
                          </Label>
                          <Input
                            value={formData.typeAffaire || ''}
                            onChange={(e) => setFormData({ ...formData, typeAffaire: e.target.value })}
                            placeholder="Civil, Penal, Commercial..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Intitule
                          </p>
                          <p className="font-medium">{dossier.intitule}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Statut
                          </p>
                          <Badge variant={statutConfig.variant} className="mt-1">
                            {statutConfig.label}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Type d'affaire
                          </p>
                          <p className="font-medium">{dossier.typeAffaire || '-'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Procedure */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Gavel className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Procedure judiciaire</CardTitle>
                        <CardDescription>Informations sur la procedure en cours</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Juridiction
                          </Label>
                          <Input
                            value={formData.juridiction || ''}
                            onChange={(e) => setFormData({ ...formData, juridiction: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Numero RG
                          </Label>
                          <Input
                            value={formData.numeroRg || ''}
                            onChange={(e) => setFormData({ ...formData, numeroRg: e.target.value })}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Juridiction
                          </p>
                          <p className="font-medium">{dossier.juridiction || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Numero RG
                          </p>
                          <p className="font-medium font-mono">{dossier.numeroRg || '-'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Description & Notes */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-lg">Description</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {editMode ? (
                        <Textarea
                          value={formData.description || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          rows={5}
                          placeholder="Description du dossier..."
                          className="resize-none"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {dossier.description || 'Aucune description'}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <StickyNote className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-lg">Notes internes</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {editMode ? (
                        <Textarea
                          value={formData.notesInternes || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, notesInternes: e.target.value })
                          }
                          rows={5}
                          placeholder="Notes internes..."
                          className="resize-none"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {dossier.notesInternes || 'Aucune note'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Client */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">Client</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold">
                        {dossier.client.prenom[0]}
                        {dossier.client.nom[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/admin/clients/${dossier.client.id}`}
                          className="font-semibold hover:text-primary transition-colors truncate block"
                        >
                          {dossier.client.prenom} {dossier.client.nom}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">
                          {dossier.client.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dates */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-lg">Dates cles</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Date d'ouverture
                          </Label>
                          <Input
                            type="date"
                            value={formData.dateOuverture || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, dateOuverture: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Date de cloture
                          </Label>
                          <Input
                            type="date"
                            value={formData.dateCloture || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, dateCloture: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">Ouverture</span>
                          <span className="font-medium">
                            {dossier.dateOuverture ? formatDate(dossier.dateOuverture) : '-'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm text-muted-foreground">Cloture</span>
                          <span className="font-medium">
                            {dossier.dateCloture ? formatDate(dossier.dateCloture) : '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <DossierTimeline dossierId={dossierId} />
          </TabsContent>

          <TabsContent value="notes">
            <DossierNotes dossierId={dossierId} />
          </TabsContent>

          <TabsContent value="tasks">
            <DossierTasks dossierId={dossierId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>Selectionnez un fichier a uploader</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                uploadFile
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv,.zip,.rar"
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1 max-w-[280px]">
                    <p className="font-medium truncate" title={uploadFile.name}>{uploadFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      setUploadFile(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Glissez un fichier ici ou cliquez pour selectionner
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, Excel, Images (max 50Mo)
                  </p>
                </>
              )}
            </div>

            {uploadFile && (
              <>
                <div className="space-y-2">
                  <Label>Nom du document</Label>
                  <Input
                    value={uploadForm.nom}
                    onChange={(e) => setUploadForm((prev) => ({ ...prev, nom: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type de document</Label>
                  <Select
                    value={uploadForm.typeDocument}
                    onValueChange={(v) => setUploadForm((prev) => ({ ...prev, typeDocument: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeDocumentLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination folder selector */}
                <div className="space-y-2">
                  <Label>Dossier de destination</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUploadForm((prev) => ({ ...prev, location: 'cabinet', visibleClient: false }))}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        uploadForm.location === 'cabinet'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-muted hover:border-blue-300'
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        uploadForm.location === 'cabinet' ? 'bg-blue-500 text-white' : 'bg-blue-100 dark:bg-blue-900'
                      }`}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">CABINET</p>
                        <p className="text-[10px] text-muted-foreground">Document interne</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadForm((prev) => ({ ...prev, location: 'client', visibleClient: true }))}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        uploadForm.location === 'client'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'border-muted hover:border-emerald-300'
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        uploadForm.location === 'client' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 dark:bg-emerald-900'
                      }`}>
                        <UserCircle className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">CLIENT</p>
                        <p className="text-[10px] text-muted-foreground">Visible par le client</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Only show visibility toggle for CABINET documents */}
                {uploadForm.location === 'cabinet' && (
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                    <div className="space-y-0.5">
                      <Label>Rendre visible au client</Label>
                      <p className="text-xs text-muted-foreground">Le client pourra voir ce document interne</p>
                    </div>
                    <Switch
                      checked={uploadForm.visibleClient}
                      onCheckedChange={(v) => setUploadForm((prev) => ({ ...prev, visibleClient: v }))}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Document sensible</Label>
                    <p className="text-xs text-muted-foreground">Marquer comme confidentiel</p>
                  </div>
                  <Switch
                    checked={uploadForm.sensible}
                    onCheckedChange={(v) => setUploadForm((prev) => ({ ...prev, sensible: v }))}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile || !uploadForm.nom || uploading}>
              {uploading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Upload...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Uploader
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={closePreview}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {selectedDoc?.nom}
              {selectedDoc && (
                <Button variant="outline" size="sm" onClick={() => handleDownload(selectedDoc)}>
                  <Download className="mr-2 h-4 w-4" />
                  Telecharger
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden rounded-lg border">
            {previewLoading ? (
              <div className="flex items-center justify-center h-[60vh]">
                <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewUrl && selectedDoc ? (
              getFileType(selectedDoc.mimeType, selectedDoc.extension) === 'pdf' ? (
                <PDFViewer url={previewUrl} />
              ) : (
                <div className="flex items-center justify-center h-[60vh] bg-muted/50">
                  <img
                    src={previewUrl}
                    alt={selectedDoc.nom}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
                Impossible de charger l'apercu
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Document Modal */}
      <Dialog open={editDocModalOpen} onOpenChange={setEditDocModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le document</DialogTitle>
            <DialogDescription>
              Modifiez les informations du document. Le nom sera aussi mis a jour sur OneDrive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom du document</Label>
              <Input
                value={editDocForm.nom}
                onChange={(e) => setEditDocForm((prev) => ({ ...prev, nom: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select
                value={editDocForm.typeDocument}
                onValueChange={(v) => setEditDocForm((prev) => ({ ...prev, typeDocument: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeDocumentLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Visible par le client</Label>
                <p className="text-xs text-muted-foreground">Le client peut voir ce document</p>
              </div>
              <Switch
                checked={editDocForm.visibleClient}
                onCheckedChange={(v) => setEditDocForm((prev) => ({ ...prev, visibleClient: v }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Document sensible</Label>
                <p className="text-xs text-muted-foreground">Marquer comme confidentiel</p>
              </div>
              <Switch
                checked={editDocForm.sensible}
                onCheckedChange={(v) => setEditDocForm((prev) => ({ ...prev, sensible: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDocModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveDoc} disabled={savingDoc}>
              {savingDoc ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Sauvegarder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le document</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer "{selectedDoc?.nom}" ? Cette action supprimera
              aussi le fichier sur OneDrive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDoc}
              disabled={deletingDoc}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingDoc ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dossier Confirmation */}
      <AlertDialog open={deleteDossierConfirmOpen} onOpenChange={setDeleteDossierConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le dossier</AlertDialogTitle>
            <AlertDialogDescription>
              Etes-vous sur de vouloir supprimer le dossier "{dossier?.reference}" ?
              Cette action est irreversible et supprimera egalement tous les documents associes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDossier}
              disabled={deletingDossier}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingDossier ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer le dossier
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

DossierShowPage.layout = (page: ReactNode) => getAdminLayout(page)
export default DossierShowPage
