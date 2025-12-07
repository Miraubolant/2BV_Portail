import { Head, Link, router } from '@inertiajs/react'
import { getAdminLayout, useBreadcrumb } from '@/components/layout/admin-layout'
import { ReactNode } from 'react'
import { ADMIN_CLIENTS } from '@/app/routes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ADMIN_CLIENTS_API, ADMIN_RESPONSABLES_API, ADMIN_DOSSIERS_API, ADMIN_FAVORIS_API, formatDate, formatDateTime } from '@/lib/constants'
import { emitFavorisUpdated } from '@/hooks/use-favoris'
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
  Calendar,
  StickyNote,
  Globe,
  Plus,
  Star,
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
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || null
  })
  const [admins, setAdmins] = useState<AdminOption[]>([])
  const [showNewDossierModal, setShowNewDossierModal] = useState(false)
  const [newDossierData, setNewDossierData] = useState({ intitule: '', typeAffaire: '', description: '' })
  const [creatingDossier, setCreatingDossier] = useState(false)

  // Favoris
  const [isFavorite, setIsFavorite] = useState(false)
  const [togglingFavorite, setTogglingFavorite] = useState(false)

  const clientId = window.location.pathname.split('/').pop()

  // Breadcrumb dynamique
  const { setBreadcrumbs, clearBreadcrumbs } = useBreadcrumb()

  useEffect(() => {
    fetchClient()
    fetchAdmins()
    checkFavorite()
  }, [clientId])

  // Mettre a jour le breadcrumb quand le client est charge
  useEffect(() => {
    if (client) {
      setBreadcrumbs([
        { label: 'Clients', href: ADMIN_CLIENTS },
        { label: `${client.prenom} ${client.nom}` },
      ])
    }
    // Nettoyer le breadcrumb quand on quitte la page
    return () => {
      clearBreadcrumbs()
    }
  }, [client, setBreadcrumbs, clearBreadcrumbs])

  const checkFavorite = async () => {
    if (!clientId) return
    try {
      const response = await fetch(`${ADMIN_FAVORIS_API}/check?type=client&id=${clientId}`, {
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
    if (!clientId) return
    setTogglingFavorite(true)
    try {
      const response = await fetch(`${ADMIN_FAVORIS_API}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'client', id: clientId }),
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
        // Only set default tab if no tab was specified in URL
        setActiveTab((prev) => prev || 'dossiers')
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

  const handleCreateDossier = async () => {
    if (!client || !newDossierData.intitule.trim()) return

    setCreatingDossier(true)
    try {
      const response = await fetch(ADMIN_DOSSIERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId: client.id,
          intitule: newDossierData.intitule,
          typeAffaire: newDossierData.typeAffaire || undefined,
          description: newDossierData.description || undefined,
        }),
      })
      if (response.ok) {
        setShowNewDossierModal(false)
        setNewDossierData({ intitule: '', typeAffaire: '', description: '' })
        await fetchClient()
      }
    } catch (error) {
      console.error('Error creating dossier:', error)
    } finally {
      setCreatingDossier(false)
    }
  }

  if (loading) {
    return (
      <>
        <Head title="Client" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  if (!client) {
    return (
      <>
        <Head title="Client non trouve" />
        <div className="text-center py-12">
          <p className="text-muted-foreground">Ce client n'existe pas</p>
          <Button variant="link" asChild>
            <Link href={ADMIN_CLIENTS}>Retour a la liste</Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
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
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">
                  {client.civilite} {client.prenom} {client.nom}
                </h1>
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
              </div>
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
            <Select
              value={client.responsableId || 'none'}
              onValueChange={async (value) => {
                const newResponsableId = value === 'none' ? null : value
                try {
                  const response = await fetch(`${ADMIN_CLIENTS_API}/${clientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ responsableId: newResponsableId }),
                  })
                  if (response.ok) {
                    await fetchClient()
                  }
                } catch (error) {
                  console.error('Error changing responsable:', error)
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <UserCog className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Responsable">
                  {client.responsable
                    ? (client.responsable.username || `${client.responsable.prenom} ${client.responsable.nom}`)
                    : 'Aucun responsable'}
                </SelectValue>
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

        <Tabs value={activeTab || 'dossiers'} onValueChange={(value) => { setActiveTab(value); if (value !== 'infos') setEditMode(false) }}>
          <TabsList>
            <TabsTrigger value="dossiers">Dossiers</TabsTrigger>
            <TabsTrigger value="infos">Informations</TabsTrigger>
            <TabsTrigger value="permissions">Permissions & Securite</TabsTrigger>
          </TabsList>

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
                  <Button size="sm" onClick={() => setShowNewDossierModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau dossier
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

      {/* Modal Nouveau Dossier */}
      <Dialog open={showNewDossierModal} onOpenChange={setShowNewDossierModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
            <DialogDescription>
              Creer un nouveau dossier pour {client.prenom} {client.nom}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="intitule">Intitule du dossier *</Label>
              <Input
                id="intitule"
                value={newDossierData.intitule}
                onChange={(e) => setNewDossierData({ ...newDossierData, intitule: e.target.value })}
                placeholder="Ex: Divorce contentieux, Litige commercial..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="typeAffaire">Type d'affaire</Label>
              <Select
                value={newDossierData.typeAffaire}
                onValueChange={(v) => setNewDossierData({ ...newDossierData, typeAffaire: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="penal">Penal</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="administratif">Administratif</SelectItem>
                  <SelectItem value="famille">Famille</SelectItem>
                  <SelectItem value="immobilier">Immobilier</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newDossierData.description}
                onChange={(e) => setNewDossierData({ ...newDossierData, description: e.target.value })}
                placeholder="Description du dossier..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDossierModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateDossier}
              disabled={creatingDossier || !newDossierData.intitule.trim()}
            >
              {creatingDossier ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Creation...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Creer le dossier
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

ClientShowPage.layout = (page: ReactNode) => getAdminLayout(page)
export default ClientShowPage
