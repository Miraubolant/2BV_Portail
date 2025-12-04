import { Head, Link, router } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ADMIN_DOSSIERS_API, ADMIN_CLIENTS_API, formatDate } from '@/lib/constants'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { DataTable, Column } from '@/components/ui/data-table'
import {
  Plus,
  Search,
  Eye,
  Edit,
} from 'lucide-react'
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

interface Dossier {
  id: string
  reference: string
  intitule: string
  statut: string
  typeAffaire: string | null
  dateOuverture: string | null
  createdAt: string
  client: {
    id: string
    nom: string
    prenom: string
  }
}

interface ClientOption {
  id: string
  nom: string
  prenom: string
}

const STATUT_OPTIONS = [
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'audience_prevue', label: 'Audience prevue' },
  { value: 'en_delibere', label: 'En delibere' },
  { value: 'cloture_gagne', label: 'Cloture - Gagne' },
  { value: 'cloture_perdu', label: 'Cloture - Perdu' },
  { value: 'cloture_transaction', label: 'Cloture - Transaction' },
  { value: 'archive', label: 'Archive' },
]

const TYPE_OPTIONS = [
  { value: 'civil', label: 'Civil' },
  { value: 'penal', label: 'Penal' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'social', label: 'Social' },
  { value: 'famille', label: 'Famille' },
  { value: 'administratif', label: 'Administratif' },
  { value: 'immobilier', label: 'Immobilier' },
]

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

const DossiersListPage = () => {
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [formData, setFormData] = useState({
    clientId: '',
    intitule: '',
    description: '',
    typeAffaire: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    lastPage: 1,
  })

  const fetchDossiers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (search) params.append('search', search)
      if (statutFilter) params.append('statut', statutFilter)

      const response = await fetch(`${ADMIN_DOSSIERS_API}?${params}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setDossiers(result.data || [])
        setPagination((prev) => ({
          ...prev,
          total: result.meta?.total || 0,
          lastPage: result.meta?.lastPage || 1,
        }))
      }
    } catch (error) {
      console.error('Error fetching dossiers:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, statutFilter])

  useEffect(() => {
    fetchDossiers()
  }, [fetchDossiers])

  const fetchClients = async () => {
    try {
      const response = await fetch(`${ADMIN_CLIENTS_API}?limit=1000`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setClients(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const handleOpenCreateModal = () => {
    fetchClients()
    setShowCreateModal(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      const response = await fetch(ADMIN_DOSSIERS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setShowCreateModal(false)
        setFormData({ clientId: '', intitule: '', description: '', typeAffaire: '' })
        fetchDossiers()
      }
    } catch (error) {
      console.error('Error creating dossier:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdateField = async (dossierId: string, field: string, value: string) => {
    try {
      const response = await fetch(`${ADMIN_DOSSIERS_API}/${dossierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      })
      if (response.ok) {
        // Update local state
        setDossiers((prev) =>
          prev.map((d) => (d.id === dossierId ? { ...d, [field]: value } : d))
        )
      }
    } catch (error) {
      console.error('Error updating dossier:', error)
    }
  }

  const columns: Column<Dossier>[] = useMemo(
    () => [
      {
        key: 'reference',
        header: 'Reference',
        sortable: true,
        render: (row) => (
          <Link
            href={`/admin/dossiers/${row.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.reference}
          </Link>
        ),
      },
      {
        key: 'intitule',
        header: 'Intitule',
        sortable: true,
      },
      {
        key: 'client',
        header: 'Client',
        sortable: true,
        getValue: (row) => `${row.client?.prenom || ''} ${row.client?.nom || ''}`.trim(),
        render: (row) => (
          <Link
            href={`/admin/clients/${row.client?.id}`}
            className="hover:underline"
          >
            {row.client?.prenom} {row.client?.nom}
          </Link>
        ),
      },
      {
        key: 'typeAffaire',
        header: 'Type',
        sortable: true,
        width: '150px',
        render: (row) => (
          <Select
            value={row.typeAffaire || ''}
            onValueChange={(value) => handleUpdateField(row.id, 'typeAffaire', value)}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder="--" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        key: 'statut',
        header: 'Statut',
        sortable: true,
        width: '180px',
        render: (row) => (
          <Select
            value={row.statut}
            onValueChange={(value) => handleUpdateField(row.id, 'statut', value)}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue>
                {(() => {
                  const config = statutLabels[row.statut] || { label: row.statut, variant: 'outline' as const }
                  return <Badge variant={config.variant}>{config.label}</Badge>
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        key: 'dateOuverture',
        header: 'Ouverture',
        sortable: true,
        getValue: (row) => row.dateOuverture ? new Date(row.dateOuverture).getTime() : 0,
        render: (row) => row.dateOuverture ? formatDate(row.dateOuverture) : '-',
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        width: '100px',
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/admin/dossiers/${row.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.visit(`/admin/dossiers/${row.id}`)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <AdminLayout title="Dossiers">
      <Head title="Dossiers" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dossiers</h1>
            <p className="text-muted-foreground">
              Gestion des dossiers du cabinet
            </p>
          </div>
          <Button onClick={handleOpenCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau dossier
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par reference, intitule ou client..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statutFilter || 'all'} onValueChange={(v) => setStatutFilter(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {STATUT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <DataTable
          data={dossiers}
          columns={columns}
          loading={loading}
          pageSize={20}
          getRowKey={(row) => row.id}
        />
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
            <DialogDescription>
              Creer un nouveau dossier pour un client
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.prenom} {client.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="intitule">Intitule *</Label>
              <Input
                id="intitule"
                placeholder="Ex: Litige bail commercial"
                value={formData.intitule}
                onChange={(e) => setFormData({ ...formData, intitule: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="typeAffaire">Type d'affaire</Label>
              <Select
                value={formData.typeAffaire}
                onValueChange={(value) => setFormData({ ...formData, typeAffaire: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description du dossier..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={processing || !formData.clientId}>
                {processing ? 'Creation...' : 'Creer le dossier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default DossiersListPage
