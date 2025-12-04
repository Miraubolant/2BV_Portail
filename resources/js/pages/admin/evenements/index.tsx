import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ADMIN_EVENEMENTS_API, ADMIN_DOSSIERS_API, formatDateTime } from '@/lib/constants'
import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Edit,
  Trash2,
  User,
  FolderOpen,
  AlertCircle,
  CalendarDays,
  List,
  X,
  ExternalLink,
} from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  nom: string
  prenom: string
}

interface DossierRef {
  id: string
  reference: string
  intitule: string
  client: Client | null
}

interface Evenement {
  id: string
  titre: string
  type: string
  dateDebut: string
  dateFin: string
  journeeEntiere: boolean
  lieu: string | null
  adresse: string | null
  salle: string | null
  description: string | null
  rappelEnvoye: boolean
  syncGoogle: boolean
  googleEventId: string | null
  dossier: DossierRef | null
}

const typeLabels: Record<string, { label: string; color: string; badgeVariant: string }> = {
  audience: { label: 'Audience', color: 'text-red-600', badgeVariant: 'bg-red-100 text-red-700 border-red-200' },
  rdv_client: { label: 'RDV Client', color: 'text-blue-600', badgeVariant: 'bg-blue-100 text-blue-700 border-blue-200' },
  rdv_adverse: { label: 'RDV Adverse', color: 'text-orange-600', badgeVariant: 'bg-orange-100 text-orange-700 border-orange-200' },
  expertise: { label: 'Expertise', color: 'text-purple-600', badgeVariant: 'bg-purple-100 text-purple-700 border-purple-200' },
  mediation: { label: 'Mediation', color: 'text-green-600', badgeVariant: 'bg-green-100 text-green-700 border-green-200' },
  echeance: { label: 'Echeance', color: 'text-yellow-600', badgeVariant: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  autre: { label: 'Autre', color: 'text-gray-600', badgeVariant: 'bg-gray-100 text-gray-700 border-gray-200' },
}

const EvenementsPage = () => {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [dossiers, setDossiers] = useState<DossierRef[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Evenement | null>(null)
  const [processing, setProcessing] = useState(false)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDossier, setFilterDossier] = useState<string>('all')
  const [filterClient, setFilterClient] = useState<string>('all')
  const [showUnassigned, setShowUnassigned] = useState(false)

  // Get unique clients from dossiers
  const clients = dossiers.reduce((acc, dossier) => {
    if (dossier.client && !acc.find((c) => c.id === dossier.client!.id)) {
      acc.push(dossier.client)
    }
    return acc
  }, [] as Client[])

  const [formData, setFormData] = useState({
    dossierId: '',
    titre: '',
    type: 'rdv_client',
    description: '',
    dateDebut: '',
    heureDebut: '09:00',
    dateFin: '',
    heureFin: '10:00',
    journeeEntiere: false,
    lieu: '',
    adresse: '',
    salle: '',
    syncGoogle: false,
  })

  const resetForm = () => {
    setFormData({
      dossierId: '',
      titre: '',
      type: 'rdv_client',
      description: '',
      dateDebut: '',
      heureDebut: '09:00',
      dateFin: '',
      heureFin: '10:00',
      journeeEntiere: false,
      lieu: '',
      adresse: '',
      salle: '',
      syncGoogle: false,
    })
  }

  const fetchDossiers = async () => {
    try {
      const response = await fetch(`${ADMIN_DOSSIERS_API}?limit=500`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setDossiers(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching dossiers:', error)
    }
  }

  const fetchEvenements = useCallback(async () => {
    setLoading(true)
    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const response = await fetch(`${ADMIN_EVENEMENTS_API}?year=${year}&month=${month}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setEvenements(result.data || result || [])
      }
    } catch (error) {
      console.error('Error fetching evenements:', error)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    fetchEvenements()
  }, [fetchEvenements])

  useEffect(() => {
    fetchDossiers()
  }, [])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // Filter events
  const filteredEvents = evenements.filter((event) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        event.titre.toLowerCase().includes(query) ||
        event.dossier?.reference.toLowerCase().includes(query) ||
        event.dossier?.client?.nom.toLowerCase().includes(query) ||
        event.dossier?.client?.prenom.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }
    if (filterType !== 'all' && event.type !== filterType) return false
    if (filterDossier !== 'all' && event.dossier?.id !== filterDossier) return false
    if (filterClient !== 'all' && event.dossier?.client?.id !== filterClient) return false
    if (showUnassigned && event.dossier !== null) return false
    return true
  })

  // Group events by date
  const eventsByDate = filteredEvents.reduce(
    (acc, event) => {
      const date = new Date(event.dateDebut).toDateString()
      if (!acc[date]) acc[date] = []
      acc[date].push(event)
      return acc
    },
    {} as Record<string, Evenement[]>
  )

  // Stats
  const stats = {
    total: evenements.length,
    thisWeek: evenements.filter((e) => {
      const eventDate = new Date(e.dateDebut)
      const now = new Date()
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      return eventDate >= weekStart && eventDate <= weekEnd
    }).length,
    unassigned: evenements.filter((e) => !e.dossier).length,
    audiences: evenements.filter((e) => e.type === 'audience').length,
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    try {
      let dateDebut: string
      let dateFin: string

      if (formData.journeeEntiere) {
        dateDebut = `${formData.dateDebut}T00:00:00`
        dateFin = `${formData.dateFin || formData.dateDebut}T23:59:59`
      } else {
        dateDebut = `${formData.dateDebut}T${formData.heureDebut}:00`
        dateFin = `${formData.dateFin || formData.dateDebut}T${formData.heureFin}:00`
      }

      const payload = {
        dossierId: formData.dossierId || null,
        titre: formData.titre,
        type: formData.type,
        description: formData.description || null,
        dateDebut,
        dateFin,
        journeeEntiere: formData.journeeEntiere,
        lieu: formData.lieu || null,
        adresse: formData.adresse || null,
        salle: formData.salle || null,
        syncGoogle: formData.syncGoogle,
      }

      const response = await fetch(ADMIN_EVENEMENTS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setShowCreateModal(false)
        resetForm()
        fetchEvenements()
      } else {
        const error = await response.json()
        console.error('Error creating event:', error)
        alert(error.message || 'Erreur lors de la creation')
      }
    } catch (error) {
      console.error('Error creating event:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent) return
    setProcessing(true)
    try {
      let dateDebut: string
      let dateFin: string

      if (formData.journeeEntiere) {
        dateDebut = `${formData.dateDebut}T00:00:00`
        dateFin = `${formData.dateFin || formData.dateDebut}T23:59:59`
      } else {
        dateDebut = `${formData.dateDebut}T${formData.heureDebut}:00`
        dateFin = `${formData.dateFin || formData.dateDebut}T${formData.heureFin}:00`
      }

      const payload = {
        dossierId: formData.dossierId || null,
        titre: formData.titre,
        type: formData.type,
        description: formData.description || null,
        dateDebut,
        dateFin,
        journeeEntiere: formData.journeeEntiere,
        lieu: formData.lieu || null,
        adresse: formData.adresse || null,
        salle: formData.salle || null,
        syncGoogle: formData.syncGoogle,
      }

      const response = await fetch(`${ADMIN_EVENEMENTS_API}/${selectedEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setShowEditModal(false)
        setSelectedEvent(null)
        resetForm()
        fetchEvenements()
      } else {
        const error = await response.json()
        console.error('Error updating event:', error)
        alert(error.message || 'Erreur lors de la modification')
      }
    } catch (error) {
      console.error('Error updating event:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedEvent) return
    setProcessing(true)
    try {
      const response = await fetch(`${ADMIN_EVENEMENTS_API}/${selectedEvent.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setSelectedEvent(null)
        fetchEvenements()
      } else {
        alert('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
    } finally {
      setProcessing(false)
    }
  }

  const openEditModal = (event: Evenement) => {
    setSelectedEvent(event)
    const startDate = new Date(event.dateDebut)
    const endDate = new Date(event.dateFin)
    setFormData({
      dossierId: event.dossier?.id || '',
      titre: event.titre,
      type: event.type,
      description: event.description || '',
      dateDebut: startDate.toISOString().split('T')[0],
      heureDebut: startDate.toTimeString().slice(0, 5),
      dateFin: endDate.toISOString().split('T')[0],
      heureFin: endDate.toTimeString().slice(0, 5),
      journeeEntiere: event.journeeEntiere,
      lieu: event.lieu || '',
      adresse: event.adresse || '',
      salle: event.salle || '',
      syncGoogle: event.syncGoogle,
    })
    setShowEditModal(true)
  }

  const getClientName = (dossier: DossierRef | null) => {
    if (!dossier?.client) return null
    return `${dossier.client.prenom} ${dossier.client.nom}`
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const EventCard = ({ event }: { event: Evenement }) => {
    const typeConfig = typeLabels[event.type] || typeLabels.autre
    const clientName = getClientName(event.dossier)

    return (
      <div
        className="rounded-lg border bg-card p-4 transition-all hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold truncate">{event.titre}</h4>
              <Badge variant="outline" className={cn('text-xs border', typeConfig.badgeVariant)}>
                {typeConfig.label}
              </Badge>
              {event.syncGoogle && event.googleEventId && (
                <Badge variant="secondary" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  Google
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {event.journeeEntiere ? (
                  'Journee entiere'
                ) : (
                  <>
                    {formatTime(event.dateDebut)} - {formatTime(event.dateFin)}
                  </>
                )}
              </span>
              {event.lieu && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.lieu}
                  {event.salle && ` - ${event.salle}`}
                </span>
              )}
            </div>

            {event.dossier ? (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <FolderOpen className="h-4 w-4 text-primary" />
                <Link
                  href={`/admin/dossiers/${event.dossier.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {event.dossier.reference}
                </Link>
                {clientName && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{clientName}</span>
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-sm text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Aucun dossier attribue</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => openEditModal(event)}
                >
                  Attribuer
                </Button>
              </div>
            )}

            {event.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <span className="sr-only">Actions</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditModal(event)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {event.dossier && (
                <DropdownMenuItem asChild>
                  <Link href={`/admin/dossiers/${event.dossier.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Voir le dossier
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  setSelectedEvent(event)
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  const EventFormFields = () => (
    <>
      {/* Dossier selection */}
      <div className="space-y-2">
        <Label htmlFor="dossierId">Dossier (optionnel)</Label>
        <Select
          value={formData.dossierId || 'none'}
          onValueChange={(value) => setFormData({ ...formData, dossierId: value === 'none' ? '' : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selectionner un dossier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun dossier</SelectItem>
            {dossiers.map((dossier) => (
              <SelectItem key={dossier.id} value={dossier.id}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{dossier.reference}</span>
                  {dossier.client && (
                    <span className="text-muted-foreground">
                      - {dossier.client.prenom} {dossier.client.nom}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.dossierId && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" />
            Client:{' '}
            {dossiers.find((d) => d.id === formData.dossierId)?.client
              ? `${dossiers.find((d) => d.id === formData.dossierId)?.client?.prenom} ${dossiers.find((d) => d.id === formData.dossierId)?.client?.nom}`
              : 'Non defini'}
          </p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="titre">Titre *</Label>
        <Input
          id="titre"
          placeholder="Titre de l'evenement"
          value={formData.titre}
          onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
          required
          minLength={3}
        />
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Type *</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([key, { label, color }]) => (
              <SelectItem key={key} value={key}>
                <span className={color}>{label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* All day checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="journeeEntiere"
          checked={formData.journeeEntiere}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, journeeEntiere: checked as boolean })
          }
        />
        <Label htmlFor="journeeEntiere" className="font-normal">
          Journee entiere
        </Label>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateDebut">Date debut *</Label>
          <Input
            id="dateDebut"
            type="date"
            value={formData.dateDebut}
            onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
            required
          />
        </div>
        {!formData.journeeEntiere && (
          <div className="space-y-2">
            <Label htmlFor="heureDebut">Heure debut *</Label>
            <Input
              id="heureDebut"
              type="time"
              value={formData.heureDebut}
              onChange={(e) => setFormData({ ...formData, heureDebut: e.target.value })}
              required
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateFin">Date fin</Label>
          <Input
            id="dateFin"
            type="date"
            value={formData.dateFin}
            onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
          />
        </div>
        {!formData.journeeEntiere && (
          <div className="space-y-2">
            <Label htmlFor="heureFin">Heure fin</Label>
            <Input
              id="heureFin"
              type="time"
              value={formData.heureFin}
              onChange={(e) => setFormData({ ...formData, heureFin: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lieu">Lieu</Label>
          <Input
            id="lieu"
            placeholder="Tribunal, Cabinet..."
            value={formData.lieu}
            onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salle">Salle</Label>
          <Input
            id="salle"
            placeholder="Salle d'audience..."
            value={formData.salle}
            onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adresse">Adresse</Label>
        <Input
          id="adresse"
          placeholder="Adresse complete"
          value={formData.adresse}
          onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Notes sur l'evenement..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      {/* Google sync */}
      <div className="flex items-center space-x-2 pt-2 border-t">
        <Checkbox
          id="syncGoogle"
          checked={formData.syncGoogle}
          onCheckedChange={(checked) => setFormData({ ...formData, syncGoogle: checked as boolean })}
        />
        <Label htmlFor="syncGoogle" className="font-normal">
          Synchroniser avec Google Calendar
        </Label>
      </div>
    </>
  )

  return (
    <AdminLayout title="Evenements">
      <Head title="Evenements" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Evenements</h1>
            <p className="text-muted-foreground">Calendrier des evenements du cabinet</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel evenement
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ce mois</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cette semaine</p>
                  <p className="text-2xl font-bold">{stats.thisWeek}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Audiences</p>
                  <p className="text-2xl font-bold">{stats.audiences}</p>
                </div>
                <Badge variant="destructive" className="h-8 px-3">
                  Urgent
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sans dossier</p>
                  <p className="text-2xl font-bold">{stats.unassigned}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and View Toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {Object.entries(typeLabels).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterDossier} onValueChange={setFilterDossier}>
                  <SelectTrigger className="w-[180px]">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Dossier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les dossiers</SelectItem>
                    {dossiers.map((dossier) => (
                      <SelectItem key={dossier.id} value={dossier.id}>
                        {dossier.reference}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterClient} onValueChange={setFilterClient}>
                  <SelectTrigger className="w-[180px]">
                    <User className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.prenom} {client.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showUnassigned"
                    checked={showUnassigned}
                    onCheckedChange={(checked) => setShowUnassigned(checked as boolean)}
                  />
                  <Label htmlFor="showUnassigned" className="font-normal text-sm whitespace-nowrap">
                    Sans dossier
                  </Label>
                </div>
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')}>
                <TabsList>
                  <TabsTrigger value="calendar">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Calendrier
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="mr-2 h-4 w-4" />
                    Liste
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        {view === 'calendar' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={goToToday}>
                    Aujourd'hui
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="capitalize text-xl">{monthName}</CardTitle>
                <div className="w-[180px]" /> {/* Spacer for centering */}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEvents.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(eventsByDate)
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, events]) => {
                      const dateObj = new Date(date)
                      const isToday = dateObj.toDateString() === new Date().toDateString()
                      return (
                        <div key={date}>
                          <div
                            className={cn(
                              'sticky top-0 z-10 -mx-6 px-6 py-2 mb-3',
                              isToday ? 'bg-primary/10' : 'bg-muted/50'
                            )}
                          >
                            <h3
                              className={cn(
                                'font-semibold text-sm uppercase',
                                isToday ? 'text-primary' : 'text-muted-foreground'
                              )}
                            >
                              {isToday && (
                                <Badge variant="default" className="mr-2">
                                  Aujourd'hui
                                </Badge>
                              )}
                              {dateObj.toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {events
                              .sort(
                                (a, b) =>
                                  new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime()
                              )
                              .map((event) => (
                                <EventCard key={event.id} event={event} />
                              ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || filterType !== 'all' || showUnassigned
                      ? 'Aucun evenement correspondant aux filtres'
                      : 'Aucun evenement ce mois-ci'}
                  </p>
                  {!searchQuery && filterType === 'all' && !showUnassigned && (
                    <Button variant="outline" className="mt-4" onClick={() => setShowCreateModal(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Creer un evenement
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* List View */}
        {view === 'list' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Liste des evenements</CardTitle>
                <Badge variant="secondary">{filteredEvents.length} evenement(s)</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEvents.length > 0 ? (
                <div className="space-y-3">
                  {filteredEvents
                    .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())
                    .map((event) => {
                      const typeConfig = typeLabels[event.type] || typeLabels.autre
                      const clientName = getClientName(event.dossier)
                      const eventDate = new Date(event.dateDebut)
                      const isPast = eventDate < new Date()

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all',
                            isPast && 'opacity-60'
                          )}
                        >
                          {/* Date column */}
                          <div className="flex flex-col items-center justify-center w-16 shrink-0">
                            <span className="text-xs text-muted-foreground uppercase">
                              {eventDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
                            </span>
                            <span className="text-2xl font-bold">{eventDate.getDate()}</span>
                            <span className="text-xs text-muted-foreground">
                              {eventDate.toLocaleDateString('fr-FR', { month: 'short' })}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold truncate">{event.titre}</h4>
                              <Badge variant="outline" className={cn('text-xs border', typeConfig.badgeVariant)}>
                                {typeConfig.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {event.journeeEntiere ? (
                                  'Journee entiere'
                                ) : (
                                  <>
                                    {formatTime(event.dateDebut)} - {formatTime(event.dateFin)}
                                  </>
                                )}
                              </span>
                              {event.lieu && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {event.lieu}
                                </span>
                              )}
                              {event.dossier && (
                                <span className="flex items-center gap-1">
                                  <FolderOpen className="h-3.5 w-3.5" />
                                  {event.dossier.reference}
                                  {clientName && (
                                    <span className="text-foreground font-medium">({clientName})</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(event)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedEvent(event)
                                setShowDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || filterType !== 'all' || showUnassigned || filterDossier !== 'all' || filterClient !== 'all'
                      ? 'Aucun evenement correspondant aux filtres'
                      : 'Aucun evenement'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel evenement</DialogTitle>
            <DialogDescription>Creer un nouvel evenement dans le calendrier</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <EventFormFields />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={processing || !formData.titre}>
                {processing ? 'Creation...' : 'Creer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'evenement</DialogTitle>
            <DialogDescription>Modifiez les informations de l'evenement</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <EventFormFields />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={processing || !formData.titre}>
                {processing ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'evenement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. L'evenement "{selectedEvent?.titre}" sera
              definitivement supprime.
              {selectedEvent?.googleEventId && (
                <span className="block mt-2 text-orange-600">
                  Cet evenement sera egalement supprime de Google Calendar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}

export default EvenementsPage
