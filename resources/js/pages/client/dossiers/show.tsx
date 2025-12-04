import { Head, Link } from '@inertiajs/react'
import { ClientLayout } from '@/components/layout/client-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { CLIENT_DOSSIERS_API, formatDate, API_BASE_URL } from '@/lib/constants'
import { useEffect, useState, useCallback, memo } from 'react'
import {
  ArrowLeft,
  FileText,
  LoaderCircle,
  Calendar,
  Gavel,
  Info,
  Download,
  Eye,
  Upload,
  X,
  File,
  Image,
  FileSpreadsheet,
  FolderKanban,
  Clock,
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
  createdAt: string
  onedriveFileId: string | null
}

interface Evenement {
  id: string
  titre: string
  description: string | null
  dateEvenement: string
  typeEvenement: string
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
  juridiction: string | null
  numeroRg: string | null
  documents?: DocumentType[]
  evenements?: Evenement[]
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
  piece_client: 'Document client',
  autre: 'Autre',
}

const typeEvenementLabels: Record<string, string> = {
  audience: 'Audience',
  reunion: 'Reunion',
  echeance: 'Echeance',
  depot: 'Depot',
  notification: 'Notification',
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

const canPreviewDoc = (mimeType: string | null): boolean => {
  if (!mimeType) return false
  return mimeType === 'application/pdf' || mimeType.startsWith('image/')
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
        const response = await fetch(`${API_BASE_URL}client/documents/${doc.id}/thumbnail?size=medium`, {
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

const ClientDossierShowPage = () => {
  const [dossier, setDossier] = useState<Dossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('documents')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocumentType | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadData, setUploadData] = useState({
    nom: '',
    typeDocument: 'piece_client',
  })
  const [dragActive, setDragActive] = useState(false)
  const [canUpload, setCanUpload] = useState(false)

  const dossierId = window.location.pathname.split('/').pop()

  const fetchDossier = useCallback(async () => {
    if (!dossierId) return
    setLoading(true)
    try {
      const response = await fetch(`${CLIENT_DOSSIERS_API}/${dossierId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setDossier(result)
      }
    } catch (error) {
      console.error('Error fetching dossier:', error)
    } finally {
      setLoading(false)
    }
  }, [dossierId])

  const checkUploadPermission = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}client/auth/me`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCanUpload(data.user?.peutUploader === true)
      }
    } catch (error) {
      console.error('Error checking upload permission:', error)
    }
  }, [])

  useEffect(() => {
    fetchDossier()
    checkUploadPermission()
  }, [fetchDossier, checkUploadPermission])

  const handleDownload = async (doc: DocumentType) => {
    setDownloading(doc.id)
    try {
      const response = await fetch(`${API_BASE_URL}client/documents/${doc.id}/download`, {
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
      console.error('Error downloading document:', error)
    } finally {
      setDownloading(null)
    }
  }

  const handlePreview = async (doc: DocumentType) => {
    setPreviewDoc(doc)
    try {
      const response = await fetch(`${API_BASE_URL}client/documents/${doc.id}/download`, {
        credentials: 'include',
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        setPreviewUrl(url)
      }
    } catch (error) {
      console.error('Error loading preview:', error)
    }
  }

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl)
    }
    setPreviewDoc(null)
    setPreviewUrl(null)
    setNumPages(null)
  }

  // Upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setUploadFile(file)
      if (!uploadData.nom) {
        setUploadData((prev) => ({ ...prev, nom: file.name.replace(/\.[^/.]+$/, '') }))
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUploadFile(file)
      if (!uploadData.nom) {
        setUploadData((prev) => ({ ...prev, nom: file.name.replace(/\.[^/.]+$/, '') }))
      }
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !dossier) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('nom', uploadData.nom || uploadFile.name.replace(/\.[^/.]+$/, ''))
      formData.append('typeDocument', uploadData.typeDocument)

      const response = await fetch(`${CLIENT_DOSSIERS_API}/${dossier.id}/documents/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
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
        setShowUploadModal(false)
        setUploadFile(null)
        setUploadData({ nom: '', typeDocument: 'piece_client' })
      }
    } catch (error) {
      console.error('Error uploading document:', error)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <ClientLayout title="Dossier">
        <Head title="Dossier" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    )
  }

  if (!dossier) {
    return (
      <ClientLayout title="Dossier non trouve">
        <Head title="Dossier non trouve" />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Dossier non trouve</p>
          <Button asChild className="mt-4">
            <Link href="/espace-client/dossiers">Retour a mes dossiers</Link>
          </Button>
        </div>
      </ClientLayout>
    )
  }

  const config = statutLabels[dossier.statut] || { label: dossier.statut, variant: 'outline' as const }
  const documents = dossier.documents || []
  const evenements = (dossier.evenements || []).sort((a, b) =>
    new Date(b.dateEvenement).getTime() - new Date(a.dateEvenement).getTime()
  )

  return (
    <ClientLayout title={dossier.reference}>
      <Head title={dossier.reference} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/espace-client/dossiers">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{dossier.reference}</h1>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
              <p className="text-muted-foreground">{dossier.intitule}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="documents">
              Documents {documents.length > 0 && `(${documents.length})`}
            </TabsTrigger>
            <TabsTrigger value="infos">Informations</TabsTrigger>
            <TabsTrigger value="chronologie">
              Chronologie {evenements.length > 0 && `(${evenements.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Informations */}
          <TabsContent value="infos" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Informations generales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Informations generales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Reference</p>
                      <p className="font-medium">{dossier.reference}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Statut</p>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                  </div>
                  {dossier.typeAffaire && (
                    <div>
                      <p className="text-sm text-muted-foreground">Type d'affaire</p>
                      <p className="font-medium">{dossier.typeAffaire}</p>
                    </div>
                  )}
                  {dossier.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{dossier.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dates et juridiction */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="h-5 w-5" />
                    Juridiction & Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date d'ouverture</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {dossier.dateOuverture ? formatDate(dossier.dateOuverture) : '-'}
                      </p>
                    </div>
                    {dossier.dateCloture && (
                      <div>
                        <p className="text-sm text-muted-foreground">Date de cloture</p>
                        <p className="font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(dossier.dateCloture)}
                        </p>
                      </div>
                    )}
                  </div>
                  {dossier.juridiction && (
                    <div>
                      <p className="text-sm text-muted-foreground">Juridiction</p>
                      <p className="font-medium">{dossier.juridiction}</p>
                    </div>
                  )}
                  {dossier.numeroRg && (
                    <div>
                      <p className="text-sm text-muted-foreground">Numero RG</p>
                      <p className="font-medium">{dossier.numeroRg}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Documents */}
          <TabsContent value="documents" className="space-y-4">
            {canUpload && (
              <div className="flex justify-end">
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Envoyer un document
                </Button>
              </div>
            )}

            {documents.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents ({documents.length})
                  </CardTitle>
                  <CardDescription>Cliquez sur un document pour l'apercevoir</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="group">
                        {/* Thumbnail */}
                        <DocumentThumbnail doc={doc} onClick={() => handlePreview(doc)} />

                        {/* Document Info */}
                        <div className="mt-2 space-y-1">
                          <p className="font-medium text-sm truncate" title={doc.nom}>
                            {doc.nom}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.tailleOctets)}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDownload(doc)}
                              disabled={downloading === doc.id}
                            >
                              {downloading === doc.id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          {/* Badge type */}
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {typeDocumentLabels[doc.typeDocument || ''] || 'Document'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderKanban className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-medium">Aucun document</p>
                  <p className="text-sm text-muted-foreground">
                    Ce dossier ne contient pas encore de documents
                  </p>
                  {canUpload && (
                    <Button className="mt-4" onClick={() => setShowUploadModal(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Envoyer un document
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Chronologie */}
          <TabsContent value="chronologie" className="space-y-4">
            {evenements.length > 0 ? (
              <div className="space-y-4">
                {evenements.map((evt) => (
                  <Card key={evt.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{evt.titre}</h3>
                            <Badge variant="outline">
                              {typeEvenementLabels[evt.typeEvenement] || evt.typeEvenement}
                            </Badge>
                          </div>
                          {evt.description && (
                            <p className="text-muted-foreground mt-1">{evt.description}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(evt.dateEvenement)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-medium">Aucun evenement</p>
                  <p className="text-sm text-muted-foreground">
                    Aucun evenement n'a ete enregistre pour ce dossier
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewDoc?.nom}</DialogTitle>
            <DialogDescription>
              {previewDoc && typeDocumentLabels[previewDoc.typeDocument || ''] || 'Document'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px] bg-muted/50 rounded-lg">
            {!previewUrl ? (
              <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : previewDoc?.mimeType === 'application/pdf' ? (
              <div className="w-full">
                <PDFDocument
                  file={previewUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={<LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />}
                >
                  {Array.from(new Array(numPages || 0), (_, index) => (
                    <Page
                      key={`page_${index + 1}`}
                      pageNumber={index + 1}
                      width={700}
                      className="mb-4"
                    />
                  ))}
                </PDFDocument>
              </div>
            ) : previewDoc?.mimeType?.startsWith('image/') ? (
              <img
                src={previewUrl}
                alt={previewDoc.nom}
                className="max-w-full max-h-[600px] object-contain"
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePreview}>
              Fermer
            </Button>
            {previewDoc && (
              <Button onClick={() => handleDownload(previewDoc)}>
                <Download className="mr-2 h-4 w-4" />
                Telecharger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Envoyer un document</DialogTitle>
            <DialogDescription>
              Ajoutez un document a votre dossier
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploadFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1 max-w-[280px]">
                    <p className="font-medium truncate" title={uploadFile.name}>{uploadFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadFile.size / 1024 / 1024).toFixed(2)} Mo
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => setUploadFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Glissez-deposez un fichier ici ou
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload-client')?.click()}
                  >
                    Parcourir
                  </Button>
                  <input
                    id="file-upload-client"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Formats acceptes: PDF, Word, Images, Texte (max 20 Mo)
                  </p>
                </>
              )}
            </div>

            {uploadFile && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="upload-nom">Nom du document</Label>
                  <Input
                    id="upload-nom"
                    value={uploadData.nom}
                    onChange={(e) => setUploadData({ ...uploadData, nom: e.target.value })}
                    placeholder="Nom du document"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-type">Type de document</Label>
                  <Select
                    value={uploadData.typeDocument}
                    onValueChange={(value) => setUploadData({ ...uploadData, typeDocument: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece_client">Document client</SelectItem>
                      <SelectItem value="justificatif">Justificatif</SelectItem>
                      <SelectItem value="correspondance">Correspondance</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
              {uploading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  )
}

export default ClientDossierShowPage
