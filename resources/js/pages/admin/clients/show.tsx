import { Head, Link, router } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ADMIN_CLIENTS_API, ADMIN_RESPONSABLES_API, formatDate, formatDateTime } from '@/lib/constants'
import { ADMIN_CLIENTS } from '@/app/routes'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Save,
  Trash2,
  Mail,
  Phone,
  Building,
  User,
  UserCog,
  FolderKanban,
  Key,
  LoaderCircle,
  MapPin,
  Shield,
  Copy,
  Check,
  FileText,
  Calendar,
  StickyNote,
  Globe,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Document {
  id: string
  nom: string
  createdAt: string
  dossier?: {
    id: string
    reference: string
  }
}

interface AdminOption {
  id: string
  username: string | null
  nom: string
  prenom: string
}

interface Client {
  id: string
  civilite: string | null
  nom: string
  prenom: string
  email: string
  dateNaissance: string | null
  lieuNaissance: string | null
  nationalite: string | null
  telephone: string | null
  telephoneSecondaire: string | null
  adresseLigne1: string | null
  adresseLigne2: string | null
  codePostal: string | null
  ville: string | null
  pays: string | null
  type: 'particulier' | 'institutionnel'
  societeNom: string | null
  societeSiret: string | null
  societeFonction: string | null
  actif: boolean
  totpEnabled: boolean
  peutUploader: boolean
  peutDemanderRdv: boolean
  accesDocumentsSensibles: boolean
  notesInternes: string | null
  lastLogin: string | null
  createdAt: string
  responsableId: string | null
  responsable: AdminOption | null
  dossiers?: Array<{
    id: string
    reference: string
    intitule: string
    statut: string
    documents?: Document[]
  }>
}

const ClientShowPage = () => {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState<Partial<Client>>({})
  const [selectedDossierId, setSelectedDossierId] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [admins, setAdmins] = useState<AdminOption[]>([])
  const [showResponsableModal, setShowResponsableModal] = useState(false)
  const [selectedResponsableId, setSelectedResponsableId] = useState<string>('')

  const clientId = window.location.pathname.split('/').pop()

  useEffect(() => {
    fetchClient()
    fetchAdmins()
  }, [clientId])

  const fetchAdmins = async () => {
    try {
      const response = await fetch(ADMIN_RESPONSABLES_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setAdmins(result || [])
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
    }
  }

  const fetchClient = async () => {
    try {
      const response = await fetch(`${ADMIN_CLIENTS_API}/${clientId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setClient(result)
        setFormData(result)
        // Si le client n'a pas de dossiers, afficher l'onglet dossiers, sinon documents
        const hasDossiers = result.dossiers && result.dossiers.length > 0
        setActiveTab(hasDossiers ? 'documents' : 'dossiers')
      }
    } catch (error) {
      console.error('Error fetching client:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${ADMIN_CLIENTS_API}/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        const updated = await response.json()
        setClient(updated)
        setEditMode(false)
      }
    } catch (error) {
      console.error('Error updating client:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`${ADMIN_CLIENTS_API}/${clientId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        router.visit(ADMIN_CLIENTS)
      }
    } catch (error) {
      console.error('Error deleting client:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleResetPassword = async () => {
    try {
      const response = await fetch(`${ADMIN_CLIENTS_API}/${clientId}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setNewPassword(result.newPassword)
      }
    } catch (error) {
      console.error('Error resetting password:', error)
    }
  }

  const copyPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleToggle = async (field: string, value: boolean) => {
    try {
      const response = await fetch(`${ADMIN_CLIENTS_API}/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      })
      if (response.ok) {
        setClient((prev) => prev ? { ...prev, [field]: value } : null)
        setFormData((prev) => ({ ...prev, [field]: value }))
      }
    } catch (error) {
      console.error('Error updating client:', error)
    }
  }

  const openResponsableModal = () => {
    setSelectedResponsableId(client?.responsableId || 'none')
    setShowResponsableModal(true)
  }

  const handleChangeResponsable = async () => {
    try {
      const newResponsableId = selectedResponsableId === 'none' ? null : selectedResponsableId
      const response = await fetch(`${ADMIN_CLIENTS_API}/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ responsableId: newResponsableId }),
      })
      if (response.ok) {
        await fetchClient()
        setShowResponsableModal(false)
      }
    } catch (error) {
      console.error('Error changing responsable:', error)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Client">
        <Head title="Client" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  if (!client) {
    return (
      <AdminLayout title="Client non trouve">
        <Head title="Client non trouve" />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ce client n'existe pas</p>
          <Button variant="link" asChild>
            <Link href={ADMIN_CLIENTS}>Retour a la liste</Link>
          </Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title={`${client.prenom} ${client.nom}`}
      breadcrumbs={[
        { label: 'Clients', href: ADMIN_CLIENTS },
        { label: `${client.prenom} ${client.nom}` },
      ]}
    >
      <Head title={`${client.prenom} ${client.nom}`} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href={ADMIN_CLIENTS}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {client.civilite} {client.prenom} {client.nom}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={client.actif ? 'default' : 'destructive'}>
                  {client.actif ? 'Actif' : 'Inactif'}
                </Badge>
                <Badge variant="outline">
                  {client.type === 'particulier' ? 'Particulier' : 'Institutionnel'}
                </Badge>
                {client.totpEnabled && (
                  <Badge variant="secondary">2FA active</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'infos' && (
              editMode ? (
                <>
                  <Button variant="outline" onClick={() => { setEditMode(false); setFormData(client) }}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  Modifier
                </Button>
              )
            )}
            <Button variant="outline" onClick={openResponsableModal}>
              <UserCog className="mr-2 h-4 w-4" />
              Responsable
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irreversible. Tous les dossiers associes seront egalement supprimes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Suppression...' : 'Supprimer'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs value={activeTab || 'documents'} onValueChange={(value) => { setActiveTab(value); if (value !== 'infos') setEditMode(false) }}>
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="dossiers">Dossiers</TabsTrigger>
            <TabsTrigger value="infos">Informations</TabsTrigger>
            <TabsTrigger value="permissions">Permissions & Securite</TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents du client
                  </CardTitle>
                  {client.dossiers && client.dossiers.length > 0 && (
                    <Select
                      value={selectedDossierId}
                      onValueChange={setSelectedDossierId}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Filtrer par dossier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les dossiers</SelectItem>
                        {client.dossiers.map((dossier) => (
                          <SelectItem key={dossier.id} value={dossier.id}>
                            {dossier.reference}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const allDocuments = client.dossiers?.flatMap(d =>
                    d.documents?.map(doc => ({ ...doc, dossier: { id: d.id, reference: d.reference } })) || []
                  ) || []

                  const filteredDocuments = selectedDossierId === 'all'
                    ? allDocuments
                    : allDocuments.filter(doc => doc.dossier?.id === selectedDossierId)

                  if (filteredDocuments.length > 0) {
                    return (
                      <div className="space-y-2">
                        {filteredDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{doc.nom}</p>
                                <p className="text-sm text-muted-foreground">
                                  {doc.dossier && (
                                    <Link
                                      href={`/admin/dossiers/${doc.dossier.id}`}
                                      className="hover:underline"
                                    >
                                      {doc.dossier.reference}
                                    </Link>
                                  )}
                                  {doc.dossier && ' - '}
                                  {formatDate(doc.createdAt)}
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              Telecharger
                            </Button>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  return (
                    <p className="text-center text-muted-foreground py-8">
                      {selectedDossierId === 'all' ? 'Aucun document' : 'Aucun document dans ce dossier'}
                    </p>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="infos" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Colonne principale */}
              <div className="lg:col-span-2 space-y-6">
                {/* Identite */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Identite</CardTitle>
                        <CardDescription>Informations personnelles</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editMode ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Civilite</Label>
                            <Select
                              value={formData.civilite || ''}
                              onValueChange={(v) => setFormData({ ...formData, civilite: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="--" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="M.">M.</SelectItem>
                                <SelectItem value="Mme">Mme</SelectItem>
                                <SelectItem value="Dr">Dr</SelectItem>
                                <SelectItem value="Me">Me</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
                            <Input
                              value={formData.email || ''}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nom</Label>
                            <Input
                              value={formData.nom || ''}
                              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Prenom</Label>
                            <Input
                              value={formData.prenom || ''}
                              onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date de naissance</Label>
                            <Input
                              type="date"
                              value={formData.dateNaissance || ''}
                              onChange={(e) => setFormData({ ...formData, dateNaissance: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Lieu de naissance</Label>
                            <Input
                              value={formData.lieuNaissance || ''}
                              onChange={(e) => setFormData({ ...formData, lieuNaissance: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nationalite</Label>
                          <Input
                            value={formData.nationalite || ''}
                            onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${client.email}`} className="font-medium hover:underline">
                              {client.email}
                            </a>
                          </div>
                        </div>
                        {client.dateNaissance && (
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Naissance</p>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatDate(client.dateNaissance)}
                                {client.lieuNaissance && ` - ${client.lieuNaissance}`}
                              </span>
                            </div>
                          </div>
                        )}
                        {client.nationalite && (
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Nationalite</p>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{client.nationalite}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contact */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Contact</CardTitle>
                        <CardDescription>Coordonnees et adresse</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editMode ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Telephone</Label>
                            <Input
                              value={formData.telephone || ''}
                              onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Telephone secondaire</Label>
                            <Input
                              value={formData.telephoneSecondaire || ''}
                              onChange={(e) => setFormData({ ...formData, telephoneSecondaire: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Adresse</Label>
                          <Input
                            value={formData.adresseLigne1 || ''}
                            onChange={(e) => setFormData({ ...formData, adresseLigne1: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Complement</Label>
                          <Input
                            value={formData.adresseLigne2 || ''}
                            onChange={(e) => setFormData({ ...formData, adresseLigne2: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Code postal</Label>
                            <Input
                              value={formData.codePostal || ''}
                              onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ville</Label>
                            <Input
                              value={formData.ville || ''}
                              onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Pays</Label>
                            <Input
                              value={formData.pays || ''}
                              onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {client.telephone && (
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Telephone principal</p>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a href={`tel:${client.telephone}`} className="font-medium hover:underline">
                                {client.telephone}
                              </a>
                            </div>
                          </div>
                        )}
                        {client.telephoneSecondaire && (
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Telephone secondaire</p>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a href={`tel:${client.telephoneSecondaire}`} className="font-medium hover:underline">
                                {client.telephoneSecondaire}
                              </a>
                            </div>
                          </div>
                        )}
                        {client.adresseLigne1 && (
                          <div className="space-y-1 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Adresse</p>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="font-medium">
                                <div>{client.adresseLigne1}</div>
                                {client.adresseLigne2 && <div>{client.adresseLigne2}</div>}
                                <div>{client.codePostal} {client.ville}</div>
                                {client.pays && client.pays !== 'France' && <div>{client.pays}</div>}
                              </div>
                            </div>
                          </div>
                        )}
                        {!client.telephone && !client.adresseLigne1 && (
                          <p className="text-muted-foreground sm:col-span-2">Aucune information de contact</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes internes */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <StickyNote className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Notes internes</CardTitle>
                        <CardDescription>Visibles uniquement par les administrateurs</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editMode ? (
                      <Textarea
                        value={formData.notesInternes || ''}
                        onChange={(e) => setFormData({ ...formData, notesInternes: e.target.value })}
                        rows={4}
                        placeholder="Notes sur le client..."
                        className="resize-none"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">
                        {client.notesInternes || 'Aucune note'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Colonne laterale */}
              <div className="space-y-6">
                {/* Entreprise - si client institutionnel */}
                {(client.type === 'institutionnel' || editMode) && (
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Building className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Entreprise</CardTitle>
                          <CardDescription>Informations societe</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {editMode ? (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type de client</Label>
                            <Select
                              value={formData.type}
                              onValueChange={(v) => setFormData({ ...formData, type: v as 'particulier' | 'institutionnel' })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="particulier">Particulier</SelectItem>
                                <SelectItem value="institutionnel">Institutionnel</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {formData.type === 'institutionnel' && (
                            <>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Raison sociale</Label>
                                <Input
                                  value={formData.societeNom || ''}
                                  onChange={(e) => setFormData({ ...formData, societeNom: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">SIRET</Label>
                                <Input
                                  value={formData.societeSiret || ''}
                                  onChange={(e) => setFormData({ ...formData, societeSiret: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Fonction</Label>
                                <Input
                                  value={formData.societeFonction || ''}
                                  onChange={(e) => setFormData({ ...formData, societeFonction: e.target.value })}
                                />
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Raison sociale</p>
                            <p className="font-medium">{client.societeNom || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">SIRET</p>
                            <p className="font-medium font-mono text-sm">{client.societeSiret || '-'}</p>
                          </div>
                          {client.societeFonction && (
                            <div className="space-y-1">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Fonction</p>
                              <p className="font-medium">{client.societeFonction}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Activite */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Activite</CardTitle>
                        <CardDescription>Historique du compte</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Date de creation</p>
                      <p className="font-medium">{formatDate(client.createdAt)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Derniere connexion</p>
                      <p className="font-medium">
                        {client.lastLogin ? formatDateTime(client.lastLogin) : 'Jamais connecte'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Dossiers</p>
                      <p className="font-medium">{client.dossiers?.length || 0} dossier(s)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Statut compte */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Statut du compte
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Compte actif</p>
                      <p className="text-sm text-muted-foreground">
                        Le client peut se connecter au portail
                      </p>
                    </div>
                    <Switch
                      checked={client.actif}
                      onCheckedChange={(checked) => handleToggle('actif', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Upload de documents</p>
                      <p className="text-sm text-muted-foreground">
                        Le client peut uploader des fichiers
                      </p>
                    </div>
                    <Switch
                      checked={client.peutUploader}
                      onCheckedChange={(checked) => handleToggle('peutUploader', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Demande de RDV</p>
                      <p className="text-sm text-muted-foreground">
                        Le client peut demander des rendez-vous
                      </p>
                    </div>
                    <Switch
                      checked={client.peutDemanderRdv}
                      onCheckedChange={(checked) => handleToggle('peutDemanderRdv', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Documents sensibles</p>
                      <p className="text-sm text-muted-foreground">
                        Acces aux documents marques comme sensibles
                      </p>
                    </div>
                    <Switch
                      checked={client.accesDocumentsSensibles}
                      onCheckedChange={(checked) => handleToggle('accesDocumentsSensibles', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Securite */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Securite
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Authentification 2FA</p>
                      <p className="text-sm text-muted-foreground">
                        {client.totpEnabled ? 'Active' : 'Non configuree'}
                      </p>
                    </div>
                    <Badge variant={client.totpEnabled ? 'default' : 'secondary'}>
                      {client.totpEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Reinitialiser le mot de passe</p>
                        <p className="text-sm text-muted-foreground">
                          Genere un nouveau mot de passe temporaire
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline">
                            <Key className="mr-2 h-4 w-4" />
                            Reset mot de passe
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reinitialiser le mot de passe ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Un nouveau mot de passe sera genere. Vous devrez le communiquer au client.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetPassword}>
                              Reinitialiser
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {newPassword && (
                      <div className="mt-4 p-4 rounded-lg bg-muted">
                        <p className="text-sm font-medium mb-2">Nouveau mot de passe:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-background rounded border font-mono">
                            {newPassword}
                          </code>
                          <Button variant="outline" size="icon" onClick={copyPassword}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Copiez ce mot de passe, il ne sera plus affiche.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="dossiers">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    Dossiers du client
                  </CardTitle>
                  <Button size="sm" asChild>
                    <Link href="/admin/dossiers">Nouveau dossier</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {client.dossiers && client.dossiers.length > 0 ? (
                  <div className="space-y-2">
                    {client.dossiers.map((dossier) => (
                      <div
                        key={dossier.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <Link
                            href={`/admin/dossiers/${dossier.id}`}
                            className="font-medium hover:underline"
                          >
                            {dossier.reference}
                          </Link>
                          <p className="text-sm text-muted-foreground">{dossier.intitule}</p>
                        </div>
                        <Badge>{dossier.statut}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun dossier pour ce client
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal Changer Responsable */}
      <Dialog open={showResponsableModal} onOpenChange={setShowResponsableModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Changer le responsable</DialogTitle>
            <DialogDescription>
              Selectionnez le responsable pour ce client
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Responsable actuel</Label>
              <p className="text-sm text-muted-foreground">
                {client.responsable
                  ? (client.responsable.username || `${client.responsable.prenom} ${client.responsable.nom}`)
                  : 'Aucun responsable assigne'}
              </p>
            </div>
            <div className="space-y-2 mt-4">
              <Label>Nouveau responsable</Label>
              <Select
                value={selectedResponsableId}
                onValueChange={setSelectedResponsableId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun responsable</SelectItem>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.username || `${admin.prenom} ${admin.nom}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponsableModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleChangeResponsable}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default ClientShowPage
