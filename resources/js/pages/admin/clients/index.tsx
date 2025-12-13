import { Head, Link, router } from '@inertiajs/react'
import { getAdminLayout } from '@/components/layout/admin-layout'
import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ADMIN_CLIENTS_API, ADMIN_RESPONSABLES_API, formatDate } from '@/lib/constants'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useClientUpdates } from '@/hooks/use-transmit'
import { useUnifiedModal } from '@/contexts/unified-modal-context'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Users,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface Client {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string | null
  type: string
  actif: boolean
  peutUploader: boolean
  peutDemanderRdv: boolean
  responsableId: string | null
  responsable: {
    id: string
    username: string | null
    nom: string
    prenom: string
  } | null
  createdAt: string
}

interface AdminOption {
  id: string
  username: string | null
  nom: string
  prenom: string
}

const ClientsListPage = () => {
  const { filterByResponsable, adminId, loading: authLoading } = useAdminAuth()
  const { openModal, subscribeToCreation } = useUnifiedModal()
  const [filterInitialized, setFilterInitialized] = useState(false)

  const [clients, setClients] = useState<Client[]>([])
  const [admins, setAdmins] = useState<AdminOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [responsableFilter, setResponsableFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [formData, setFormData] = useState({
    // Identite
    civilite: '',
    nom: '',
    prenom: '',
    email: '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: 'Francaise',
    // Contact
    telephone: '',
    telephoneSecondaire: '',
    adresseLigne1: '',
    adresseLigne2: '',
    codePostal: '',
    ville: '',
    pays: 'France',
    // Professionnel
    type: 'particulier',
    societeNom: '',
    societeSiret: '',
    societeFonction: '',
    // Permissions
    peutUploader: true,
    peutDemanderRdv: true,
    actif: true,
    // Notes
    notesInternes: '',
    // Responsable
    responsableId: '' as string | null,
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    lastPage: 1,
  })

  const resetForm = () => {
    setFormData({
      civilite: '',
      nom: '',
      prenom: '',
      email: '',
      dateNaissance: '',
      lieuNaissance: '',
      nationalite: 'Francaise',
      telephone: '',
      telephoneSecondaire: '',
      adresseLigne1: '',
      adresseLigne2: '',
      codePostal: '',
      ville: '',
      pays: 'France',
      type: 'particulier',
      societeNom: '',
      societeSiret: '',
      societeFonction: '',
      peutUploader: true,
      peutDemanderRdv: true,
      actif: true,
      notesInternes: '',
      responsableId: '',
    })
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

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search) params.append('search', search)
      if (typeFilter) params.append('type', typeFilter)
      if (responsableFilter) params.append('responsableId', responsableFilter)

      const response = await fetch(`${ADMIN_CLIENTS_API}?${params}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setClients(result.data || [])
        setPagination((prev) => ({
          ...prev,
          total: result.meta?.total || 0,
          lastPage: result.meta?.lastPage || 1,
        }))
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, typeFilter, responsableFilter])

  // Initialiser le filtre responsable si l'option est activee
  useEffect(() => {
    if (!authLoading && !filterInitialized) {
      if (filterByResponsable && adminId) {
        setResponsableFilter(adminId)
      }
      setFilterInitialized(true)
    }
  }, [authLoading, filterByResponsable, adminId, filterInitialized])

  useEffect(() => {
    // Attendre l'initialisation du filtre avant de fetch
    if (filterInitialized) {
      fetchClients()
    }
  }, [fetchClients, filterInitialized])

  useEffect(() => {
    fetchAdmins()
  }, [])

  // S'abonner aux creations depuis le modal unifie
  useEffect(() => {
    const unsubscribe = subscribeToCreation((type) => {
      if (type === 'client') {
        fetchClients()
      }
    })
    return unsubscribe
  }, [subscribeToCreation, fetchClients])

  // Ecouter les mises a jour en temps reel
  const handleClientUpdated = useCallback((updatedClient: Client) => {
    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
    )
  }, [])

  useClientUpdates(handleClientUpdated)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const response = await fetch(ADMIN_CLIENTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setShowCreateModal(false)
        resetForm()
        fetchClients()
      }
    } catch (error) {
      console.error('Error creating client:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleEdit = (client: Client) => {
    router.visit(`/admin/clients/${client.id}?tab=infos`)
  }

  const handleUpdateField = async (clientId: string, field: string, value: boolean | string | null) => {
    try {
      const response = await fetch(`${ADMIN_CLIENTS_API}/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      })
      if (response.ok) {
        // Refetch to get updated responsable relation
        if (field === 'responsableId') {
          fetchClients()
        } else {
          setClients((prev) =>
            prev.map((c) => (c.id === clientId ? { ...c, [field]: value } : c))
          )
        }
      }
    } catch (error) {
      console.error('Error updating client:', error)
    }
  }

  const columns: Column<Client>[] = useMemo(
    () => [
      {
        key: 'nom',
        header: 'Nom',
        sortable: true,
        getValue: (row) => `${row.prenom} ${row.nom}`,
        render: (row) => (
          <Link href={`/admin/clients/${row.id}`} className="font-medium hover:underline">
            {row.prenom} {row.nom}
          </Link>
        ),
      },
      {
        key: 'email',
        header: 'Email',
        sortable: true,
      },
      {
        key: 'telephone',
        header: 'Telephone',
        sortable: true,
        render: (row) => row.telephone || '-',
      },
      {
        key: 'type',
        header: 'Type',
        sortable: true,
        render: (row) => (
          <Badge variant={row.type === 'particulier' ? 'default' : 'secondary'}>
            {row.type === 'particulier' ? 'Particulier' : 'Institutionnel'}
          </Badge>
        ),
      },
      {
        key: 'responsable',
        header: 'Responsable',
        sortable: true,
        width: '180px',
        getValue: (row) => row.responsable?.username || row.responsable?.nom || '',
        render: (row) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={row.responsableId || 'none'}
              onValueChange={(value) => handleUpdateField(row.id, 'responsableId', value === 'none' ? null : value)}
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue placeholder="--">
                  {row.responsable ? (row.responsable.username || `${row.responsable.prenom} ${row.responsable.nom}`) : '--'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">--</SelectItem>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.username || `${admin.prenom} ${admin.nom}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ),
      },
      {
        key: 'actif',
        header: 'Statut',
        sortable: true,
        width: '130px',
        render: (row) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={row.actif ? 'actif' : 'inactif'}
              onValueChange={(value) => handleUpdateField(row.id, 'actif', value === 'actif')}
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue>
                  <Badge variant={row.actif ? 'default' : 'destructive'}>
                    {row.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="inactif">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ),
      },
      {
        key: 'permissions',
        header: 'Permissions',
        sortable: false,
        render: (row) => (
          <div className="flex gap-1">
            {row.peutUploader && (
              <Badge variant="outline" className="text-xs">Upload</Badge>
            )}
            {row.peutDemanderRdv && (
              <Badge variant="outline" className="text-xs">RDV</Badge>
            )}
          </div>
        ),
      },
      {
        key: 'createdAt',
        header: 'Date creation',
        sortable: true,
        getValue: (row) => new Date(row.createdAt).getTime(),
        render: (row) => formatDate(row.createdAt),
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        width: '120px',
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/admin/clients/${row.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [admins]
  )

  return (
    <>
      <Head title="Clients" />

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <Users className="h-6 w-6 sm:h-8 sm:w-8" />
              Clients
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gestion des clients du cabinet
            </p>
          </div>
          <Button onClick={() => openModal({ tab: 'client' })} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 sm:h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
                <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="particulier">Particulier</SelectItem>
                    <SelectItem value="institutionnel">Institutionnel</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={responsableFilter || 'all'} onValueChange={(v) => setResponsableFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="none">Sans responsable</SelectItem>
                    {admins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.username || `${admin.prenom} ${admin.nom}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <DataTable
          data={clients}
          columns={columns}
          loading={loading}
          pageSize={20}
          getRowKey={(row) => row.id}
        />
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>
              Creer un nouveau client dans le systeme
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <Tabs defaultValue="identite" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="identite">Identite</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="professionnel">Professionnel</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>

              <TabsContent value="identite" className="space-y-4 mt-4 min-h-[320px]">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="civilite">Civilite</Label>
                    <Select
                      value={formData.civilite}
                      onValueChange={(value) => setFormData({ ...formData, civilite: value })}
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
                  <div className="space-y-2 col-span-3">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jean.dupont@email.fr"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      placeholder="Dupont"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prenom *</Label>
                    <Input
                      id="prenom"
                      placeholder="Jean"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateNaissance">Date de naissance</Label>
                    <Input
                      id="dateNaissance"
                      type="date"
                      value={formData.dateNaissance}
                      onChange={(e) => setFormData({ ...formData, dateNaissance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
                    <Input
                      id="lieuNaissance"
                      placeholder="Paris"
                      value={formData.lieuNaissance}
                      onChange={(e) => setFormData({ ...formData, lieuNaissance: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationalite">Nationalite</Label>
                  <Input
                    id="nationalite"
                    placeholder="Francaise"
                    value={formData.nationalite}
                    onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4 mt-4 min-h-[320px]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Telephone</Label>
                    <Input
                      id="telephone"
                      placeholder="06 12 34 56 78"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephoneSecondaire">Telephone secondaire</Label>
                    <Input
                      id="telephoneSecondaire"
                      placeholder="01 23 45 67 89"
                      value={formData.telephoneSecondaire}
                      onChange={(e) => setFormData({ ...formData, telephoneSecondaire: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresseLigne1">Adresse</Label>
                  <Input
                    id="adresseLigne1"
                    placeholder="123 rue du Palais"
                    value={formData.adresseLigne1}
                    onChange={(e) => setFormData({ ...formData, adresseLigne1: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adresseLigne2">Complement d'adresse</Label>
                  <Input
                    id="adresseLigne2"
                    placeholder="Batiment A, Appartement 12"
                    value={formData.adresseLigne2}
                    onChange={(e) => setFormData({ ...formData, adresseLigne2: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codePostal">Code postal</Label>
                    <Input
                      id="codePostal"
                      placeholder="75001"
                      value={formData.codePostal}
                      onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      placeholder="Paris"
                      value={formData.ville}
                      onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pays">Pays</Label>
                    <Input
                      id="pays"
                      placeholder="France"
                      value={formData.pays}
                      onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="professionnel" className="space-y-4 mt-4 min-h-[320px]">
                <div className="space-y-2">
                  <Label htmlFor="type">Type de client *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
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
                      <Label htmlFor="societeNom">Nom de la societe</Label>
                      <Input
                        id="societeNom"
                        placeholder="Entreprise SARL"
                        value={formData.societeNom}
                        onChange={(e) => setFormData({ ...formData, societeNom: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="societeSiret">SIRET</Label>
                        <Input
                          id="societeSiret"
                          placeholder="123 456 789 00012"
                          value={formData.societeSiret}
                          onChange={(e) => setFormData({ ...formData, societeSiret: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="societeFonction">Fonction</Label>
                        <Input
                          id="societeFonction"
                          placeholder="Gerant"
                          value={formData.societeFonction}
                          onChange={(e) => setFormData({ ...formData, societeFonction: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4 mt-4 min-h-[320px]">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="actif"
                      checked={formData.actif}
                      onCheckedChange={(checked) => setFormData({ ...formData, actif: checked as boolean })}
                    />
                    <Label htmlFor="actif" className="font-normal">
                      Compte actif (le client peut se connecter)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="peutUploader"
                      checked={formData.peutUploader}
                      onCheckedChange={(checked) => setFormData({ ...formData, peutUploader: checked as boolean })}
                    />
                    <Label htmlFor="peutUploader" className="font-normal">
                      Peut uploader des documents
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="peutDemanderRdv"
                      checked={formData.peutDemanderRdv}
                      onCheckedChange={(checked) => setFormData({ ...formData, peutDemanderRdv: checked as boolean })}
                    />
                    <Label htmlFor="peutDemanderRdv" className="font-normal">
                      Peut demander des rendez-vous
                    </Label>
                  </div>
                </div>
                <div className="space-y-2 pt-4">
                  <Label htmlFor="notesInternes">Notes internes</Label>
                  <Textarea
                    id="notesInternes"
                    placeholder="Notes visibles uniquement par les administrateurs..."
                    value={formData.notesInternes}
                    onChange={(e) => setFormData({ ...formData, notesInternes: e.target.value })}
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? 'Creation...' : 'Creer le client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

ClientsListPage.layout = (page: ReactNode) => getAdminLayout(page)
export default ClientsListPage
