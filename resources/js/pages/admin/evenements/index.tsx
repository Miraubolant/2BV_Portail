import { Head, Link } from '@inertiajs/react'
import { getAdminLayout } from '@/components/layout/admin-layout'
import { type ReactNode } from 'react'
import { useUnifiedModal } from '@/contexts/unified-modal-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ADMIN_EVENEMENTS_API, ADMIN_DOSSIERS_API, ADMIN_RESPONSABLES_API, GOOGLE_ACTIVE_CALENDARS_API, formatDateTime } from '@/lib/constants'
import { useEffect, useState, useCallback, memo } from 'react'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { FilterBar } from '@/components/ui/filter-bar'
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Edit,
  Trash2,
  User,
  FolderOpen,
  AlertCircle,
  CalendarDays,
  List,
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

interface ResponsableOption {
  id: string
  nom: string
  prenom: string
  username: string | null
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
  googleCalendarId: string | null
  dossier: DossierRef | null
}

interface ActiveCalendar {
  id: string
  calendarId: string
  calendarName: string
  calendarColor: string | null
  accountEmail: string | null
  tokenId: string
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

interface FormData {
  dossierId: string
  titre: string
  type: string
  description: string
  dateDebut: string
  heureDebut: string
  dateFin: string
  heureFin: string
  journeeEntiere: boolean
  lieu: string
  adresse: string
  salle: string
  syncGoogle: boolean
  googleCalendarId: string
}

interface EventFormFieldsProps {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  dossiers: DossierRef[]
  activeCalendars: ActiveCalendar[]
}

const EventFormFields = memo(function EventFormFields({ formData, setFormData, dossiers, activeCalendars }: EventFormFieldsProps) {
  const [dossierSearch, setDossierSearch] = useState('')

  const filteredDossiers = dossiers.filter((dossier) => {
    if (!dossierSearch) return true
    const search = dossierSearch.toLowerCase()
    return (
      dossier.reference.toLowerCase().includes(search) ||
      dossier.intitule?.toLowerCase().includes(search) ||
      dossier.client?.nom.toLowerCase().includes(search) ||
      dossier.client?.prenom.toLowerCase().includes(search)
    )
  })

  const selectedDossier = dossiers.find((d) => d.id === formData.dossierId)

  return (
    <div className="space-y-6">
      {/* Section 1: Informations principales */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Informations principales
        </div>

        {/* Title and Type on same row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              placeholder="Ex: Audience TGI, RDV client Dupont..."
              value={formData.titre}
              onChange={(e) => setFormData((prev) => ({ ...prev, titre: e.target.value }))}
              required
              minLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([key, { label, badgeVariant }]) => (
                  <SelectItem key={key} value={key}>
                    <Badge variant="outline" className={cn('text-xs', badgeVariant)}>
                      {label}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dossier selection with search */}
        <div className="space-y-2">
          <Label htmlFor="dossierId">Dossier associe</Label>
          <Select
            value={formData.dossierId || 'none'}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, dossierId: value === 'none' ? '' : value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selectionner un dossier (optionnel)">
                {selectedDossier ? (
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <span className="font-medium">{selectedDossier.reference}</span>
                    {selectedDossier.client && (
                      <span className="text-muted-foreground text-sm">
                        - {selectedDossier.client.prenom} {selectedDossier.client.nom}
                      </span>
                    )}
                  </div>
                ) : (
                  'Aucun dossier'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un dossier..."
                    value={dossierSearch}
                    onChange={(e) => setDossierSearch(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              </div>
              <SelectItem value="none">
                <span className="text-muted-foreground">Aucun dossier</span>
              </SelectItem>
              {filteredDossiers.slice(0, 20).map((dossier) => (
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
              {filteredDossiers.length > 20 && (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  +{filteredDossiers.length - 20} autres resultats...
                </div>
              )}
            </SelectContent>
          </Select>
          {selectedDossier?.client && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <User className="h-3 w-3" />
              Client: <span className="font-medium text-foreground">{selectedDossier.client.prenom} {selectedDossier.client.nom}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Date et heure */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            Date et heure
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="journeeEntiere"
              checked={formData.journeeEntiere}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, journeeEntiere: checked as boolean }))
              }
            />
            <Label htmlFor="journeeEntiere" className="font-normal text-sm">
              Journee entiere
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Debut *</Label>
            <Input
              type="date"
              value={formData.dateDebut}
              onChange={(e) => setFormData((prev) => ({ ...prev, dateDebut: e.target.value }))}
              required
            />
            {!formData.journeeEntiere && (
              <Input
                type="time"
                value={formData.heureDebut}
                onChange={(e) => setFormData((prev) => ({ ...prev, heureDebut: e.target.value }))}
                required
              />
            )}
          </div>
          <div className="space-y-3 p-3 rounded-lg bg-muted/30">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Fin</Label>
            <Input
              type="date"
              value={formData.dateFin}
              onChange={(e) => setFormData((prev) => ({ ...prev, dateFin: e.target.value }))}
              placeholder={formData.dateDebut}
            />
            {!formData.journeeEntiere && (
              <Input
                type="time"
                value={formData.heureFin}
                onChange={(e) => setFormData((prev) => ({ ...prev, heureFin: e.target.value }))}
              />
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Lieu */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4" />
          Lieu (optionnel)
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lieu">Lieu</Label>
            <Input
              id="lieu"
              placeholder="Tribunal, Cabinet, Visio..."
              value={formData.lieu}
              onChange={(e) => setFormData((prev) => ({ ...prev, lieu: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salle">Salle / Chambre</Label>
            <Input
              id="salle"
              placeholder="1ere chambre civile..."
              value={formData.salle}
              onChange={(e) => setFormData((prev) => ({ ...prev, salle: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse complete</Label>
          <Input
            id="adresse"
            placeholder="4 Boulevard du Palais, 75001 Paris"
            value={formData.adresse}
            onChange={(e) => setFormData((prev) => ({ ...prev, adresse: e.target.value }))}
          />
        </div>
      </div>

      {/* Section 4: Notes et options */}
      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="description">Notes / Description</Label>
          <Textarea
            id="description"
            placeholder="Informations supplementaires, points a aborder..."
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="space-y-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-xs text-muted-foreground">Synchroniser avec votre agenda Google</p>
              </div>
            </div>
            <Checkbox
              id="syncGoogle"
              checked={formData.syncGoogle}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, syncGoogle: checked as boolean }))}
            />
          </div>
          {formData.syncGoogle && activeCalendars.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-blue-100 dark:border-blue-900">
              <Label htmlFor="googleCalendarId" className="text-xs">Calendrier cible</Label>
              <Select
                value={formData.googleCalendarId || ''}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, googleCalendarId: value }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selectionner un calendrier" />
                </SelectTrigger>
                <SelectContent>
                  {activeCalendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      <div className="flex items-center gap-2">
                        {cal.calendarColor && (
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cal.calendarColor }}
                          />
                        )}
                        <span>{cal.calendarName}</span>
                        {cal.accountEmail && (
                          <span className="text-xs text-muted-foreground">({cal.accountEmail})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

const EvenementsPage = () => {
  const { filterByResponsable, adminId, loading: authLoading } = useAdminAuth()
  const { subscribeToCreation } = useUnifiedModal()
  const [filterInitialized, setFilterInitialized] = useState(false)

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
  const [filterResponsable, setFilterResponsable] = useState<string>('all')
  const [filterCalendar, setFilterCalendar] = useState<string>('all')
  const [showUnassigned, setShowUnassigned] = useState(false)
  const [responsables, setResponsables] = useState<ResponsableOption[]>([])
  const [activeCalendars, setActiveCalendars] = useState<ActiveCalendar[]>([])

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
    googleCalendarId: '',
  })

  const resetForm = (date?: Date) => {
    const targetDate = date || new Date()
    const dateStr = targetDate.toISOString().split('T')[0]
    setFormData({
      dossierId: '',
      titre: '',
      type: 'rdv_client',
      description: '',
      dateDebut: dateStr,
      heureDebut: '09:00',
      dateFin: dateStr,
      heureFin: '10:00',
      journeeEntiere: false,
      lieu: '',
      adresse: '',
      salle: '',
      syncGoogle: true,
      googleCalendarId: activeCalendars.length > 0 ? activeCalendars[0].id : '',
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

  const fetchResponsables = async () => {
    try {
      const response = await fetch(ADMIN_RESPONSABLES_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setResponsables(result || [])
      }
    } catch (error) {
      console.error('Error fetching responsables:', error)
    }
  }

  const fetchActiveCalendars = async () => {
    try {
      const response = await fetch(GOOGLE_ACTIVE_CALENDARS_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setActiveCalendars(result.calendars || [])
      }
    } catch (error) {
      console.error('Error fetching active calendars:', error)
    }
  }

  const fetchEvenements = useCallback(async () => {
    setLoading(true)
    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth() + 1
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
      })
      if (filterResponsable && filterResponsable !== 'all') {
        params.append('responsableId', filterResponsable)
      }
      const response = await fetch(`${ADMIN_EVENEMENTS_API}?${params}`, {
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
  }, [currentMonth, filterResponsable])

  // Initialiser le filtre responsable si l'option est activee
  useEffect(() => {
    if (!authLoading && !filterInitialized) {
      if (filterByResponsable && adminId) {
        setFilterResponsable(adminId)
      }
      setFilterInitialized(true)
    }
  }, [authLoading, filterByResponsable, adminId, filterInitialized])

  useEffect(() => {
    // Attendre l'initialisation du filtre avant de fetch
    if (filterInitialized) {
      fetchEvenements()
    }
  }, [fetchEvenements, filterInitialized])

  useEffect(() => {
    fetchDossiers()
    fetchResponsables()
    fetchActiveCalendars()
  }, [])

  // S'abonner aux creations depuis le modal unifie
  useEffect(() => {
    const unsubscribe = subscribeToCreation((type) => {
      if (type === 'evenement') {
        fetchEvenements()
      }
    })
    return unsubscribe
  }, [subscribeToCreation, fetchEvenements])

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
    if (filterCalendar !== 'all') {
      if (filterCalendar === 'local') {
        if (event.googleCalendarId !== null) return false
      } else {
        if (event.googleCalendarId !== filterCalendar) return false
      }
    }
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
        googleCalendarId: formData.syncGoogle && formData.googleCalendarId ? formData.googleCalendarId : null,
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
        googleCalendarId: formData.syncGoogle && formData.googleCalendarId ? formData.googleCalendarId : null,
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
      googleCalendarId: event.googleCalendarId || '',
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

  return (
    <>
      <Head title="Evenements" />

      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <CalendarDays className="h-6 w-6 sm:h-8 sm:w-8" />
              Evenements
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Calendrier des evenements du cabinet</p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreateModal(true) }} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel evenement
          </Button>
        </div>

        {/* Filters and View Toggle */}
        <FilterBar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Rechercher un evenement..."
          filters={[
            {
              id: 'type',
              type: 'select',
              label: 'Type',
              placeholder: 'Type',
              value: filterType === 'all' ? '' : filterType,
              onChange: (v) => setFilterType(v as string || 'all'),
              allLabel: 'Tous les types',
              width: 'w-[140px]',
              options: Object.entries(typeLabels).map(([key, { label }]) => ({
                value: key,
                label,
              })),
            },
            {
              id: 'dossier',
              type: 'select',
              label: 'Dossier',
              placeholder: 'Dossier',
              value: filterDossier === 'all' ? '' : filterDossier,
              onChange: (v) => setFilterDossier(v as string || 'all'),
              allLabel: 'Tous les dossiers',
              width: 'w-[160px]',
              options: dossiers.map((dossier) => ({
                value: dossier.id,
                label: dossier.reference,
              })),
            },
            {
              id: 'client',
              type: 'select',
              label: 'Client',
              placeholder: 'Client',
              value: filterClient === 'all' ? '' : filterClient,
              onChange: (v) => setFilterClient(v as string || 'all'),
              allLabel: 'Tous les clients',
              width: 'w-[160px]',
              options: clients.map((client) => ({
                value: client.id,
                label: `${client.prenom} ${client.nom}`,
              })),
            },
            {
              id: 'responsable',
              type: 'select',
              label: 'Responsable',
              placeholder: 'Responsable',
              value: filterResponsable === 'all' ? '' : filterResponsable,
              onChange: (v) => setFilterResponsable(v as string || 'all'),
              allLabel: 'Tous les responsables',
              width: 'w-[170px]',
              options: [
                { value: 'none', label: 'Sans responsable' },
                ...responsables.map((resp) => ({
                  value: resp.id,
                  label: resp.username || `${resp.prenom} ${resp.nom}`,
                })),
              ],
            },
            ...(activeCalendars.length > 0
              ? [
                  {
                    id: 'calendar',
                    type: 'select' as const,
                    label: 'Calendrier',
                    placeholder: 'Calendrier',
                    value: filterCalendar === 'all' ? '' : filterCalendar,
                    onChange: (v: string | boolean) => setFilterCalendar(v as string || 'all'),
                    allLabel: 'Tous les calendriers',
                    width: 'w-[160px]',
                    options: [
                      { value: 'local', label: 'Local (non sync)' },
                      ...activeCalendars.map((cal) => ({
                        value: cal.id,
                        label: cal.calendarName,
                        color: cal.calendarColor || undefined,
                      })),
                    ],
                  },
                ]
              : []),
            {
              id: 'unassigned',
              type: 'checkbox',
              label: 'Sans dossier',
              value: showUnassigned,
              onChange: (v) => setShowUnassigned(v as boolean),
            },
          ]}
          onClearAll={() => {
            setSearchQuery('')
            setFilterType('all')
            setFilterDossier('all')
            setFilterClient('all')
            setFilterResponsable('all')
            setFilterCalendar('all')
            setShowUnassigned(false)
          }}
          rightContent={
            <Tabs value={view} onValueChange={(v) => setView(v as 'calendar' | 'list')}>
              <TabsList className="h-9">
                <TabsTrigger value="calendar" title="Calendrier" className="px-2 sm:px-3">
                  <CalendarDays className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="list" title="Liste" className="px-2 sm:px-3">
                  <List className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        {/* Calendar View */}
        {view === 'calendar' && (() => {
          // Build calendar grid
          const year = currentMonth.getFullYear()
          const month = currentMonth.getMonth()
          const firstDay = new Date(year, month, 1)
          const lastDay = new Date(year, month + 1, 0)
          const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // Monday = 0
          const daysInMonth = lastDay.getDate()
          const today = new Date()

          // Build weeks array
          const weeks: (number | null)[][] = []
          let currentWeek: (number | null)[] = []

          // Add empty cells before first day
          for (let i = 0; i < startDay; i++) {
            currentWeek.push(null)
          }

          // Add days
          for (let day = 1; day <= daysInMonth; day++) {
            currentWeek.push(day)
            if (currentWeek.length === 7) {
              weeks.push(currentWeek)
              currentWeek = []
            }
          }

          // Add empty cells after last day
          while (currentWeek.length > 0 && currentWeek.length < 7) {
            currentWeek.push(null)
          }
          if (currentWeek.length > 0) {
            weeks.push(currentWeek)
          }

          const getEventsForDay = (day: number) => {
            return filteredEvents.filter((event) => {
              const eventDate = new Date(event.dateDebut)
              return eventDate.getDate() === day &&
                     eventDate.getMonth() === month &&
                     eventDate.getFullYear() === year
            }).sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())
          }

          const handleDayClick = (day: number) => {
            const date = new Date(year, month, day)
            resetForm(date)
            setShowCreateModal(true)
          }

          // Mobile: show abbreviated day names, Desktop: full names
          const dayNames = {
            short: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
            medium: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
          }

          return (
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
                  <div className="flex items-center gap-1 sm:gap-2 order-2 sm:order-1">
                    <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 sm:h-9 sm:w-9">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday} className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
                      Aujourd'hui
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 sm:h-9 sm:w-9">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="capitalize text-base sm:text-xl order-1 sm:order-2">{monthName}</CardTitle>
                  <Badge variant="secondary" className="text-xs sm:text-sm order-3">
                    {filteredEvents.length} evt{filteredEvents.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-1.5 sm:p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    {/* Days header */}
                    <div className="grid grid-cols-7 bg-muted/50 border-b">
                      {dayNames.medium.map((day, i) => (
                        <div
                          key={day + i}
                          className={cn(
                            'py-1.5 sm:py-2 text-center text-[10px] sm:text-sm font-medium text-muted-foreground',
                            i === 5 || i === 6 ? 'text-muted-foreground/60' : ''
                          )}
                        >
                          <span className="hidden sm:inline">{day}</span>
                          <span className="sm:hidden">{dayNames.short[i]}</span>
                        </div>
                      ))}
                    </div>
                    {/* Calendar grid */}
                    <div className="divide-y">
                      {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="grid grid-cols-7 divide-x min-h-[60px] sm:min-h-[100px]">
                          {week.map((day, dayIndex) => {
                            if (day === null) {
                              return <div key={dayIndex} className="bg-muted/20 p-0.5 sm:p-1" />
                            }

                            const dayEvents = getEventsForDay(day)
                            const isToday = today.getDate() === day &&
                                           today.getMonth() === month &&
                                           today.getFullYear() === year
                            const isWeekend = dayIndex === 5 || dayIndex === 6

                            return (
                              <div
                                key={dayIndex}
                                className={cn(
                                  'p-0.5 sm:p-1 relative group transition-colors cursor-pointer hover:bg-muted/30 min-w-0',
                                  isWeekend && 'bg-muted/10',
                                  isToday && 'bg-primary/5'
                                )}
                                onClick={() => handleDayClick(day)}
                              >
                                {/* Day number */}
                                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                                  <span
                                    className={cn(
                                      'inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 text-[10px] sm:text-sm rounded-full',
                                      isToday && 'bg-primary text-primary-foreground font-bold',
                                      !isToday && 'font-medium text-foreground'
                                    )}
                                  >
                                    {day}
                                  </span>
                                  <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                                </div>
                                {/* Events - responsive display */}
                                <div className="space-y-0.5 max-h-[36px] sm:max-h-[72px] overflow-hidden">
                                  {dayEvents.slice(0, 3).map((event, eventIndex) => {
                                    const typeConfig = typeLabels[event.type] || typeLabels.autre
                                    // Hide 3rd event on mobile
                                    const hideOnMobile = eventIndex >= 2
                                    return (
                                      <div
                                        key={event.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openEditModal(event)
                                        }}
                                        className={cn(
                                          'text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded truncate cursor-pointer transition-all hover:ring-1 hover:ring-primary/50',
                                          typeConfig.badgeVariant,
                                          hideOnMobile && 'hidden sm:block'
                                        )}
                                        title={`${event.titre}${event.journeeEntiere ? '' : ` - ${formatTime(event.dateDebut)}`}`}
                                      >
                                        <span className="hidden sm:inline">
                                          {!event.journeeEntiere && (
                                            <span className="font-medium mr-1">{formatTime(event.dateDebut)}</span>
                                          )}
                                          {event.titre}
                                        </span>
                                        <span className="sm:hidden">
                                          {event.titre.slice(0, 6)}{event.titre.length > 6 ? '...' : ''}
                                        </span>
                                      </div>
                                    )
                                  })}
                                  {dayEvents.length > 3 && (
                                    <div className="text-[9px] sm:text-xs text-muted-foreground px-1 sm:px-1.5 font-medium hidden sm:block">
                                      +{dayEvents.length - 3}
                                    </div>
                                  )}
                                  {dayEvents.length > 2 && (
                                    <div className="text-[9px] text-muted-foreground px-1 font-medium sm:hidden">
                                      +{dayEvents.length - 2}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })()}

        {/* List View */}
        {view === 'list' && (
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Liste des evenements</CardTitle>
                <Badge variant="secondary" className="text-xs sm:text-sm">{filteredEvents.length} evt(s)</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEvents.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
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
                            'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:shadow-md transition-all',
                            isPast && 'opacity-60'
                          )}
                        >
                          {/* Date column - horizontal on mobile, vertical on desktop */}
                          <div className="flex sm:flex-col items-center justify-start sm:justify-center gap-2 sm:gap-0 sm:w-16 shrink-0">
                            <div className="flex sm:flex-col items-center gap-1 sm:gap-0">
                              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase">
                                {eventDate.toLocaleDateString('fr-FR', { weekday: 'short' })}
                              </span>
                              <span className="text-lg sm:text-2xl font-bold">{eventDate.getDate()}</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                {eventDate.toLocaleDateString('fr-FR', { month: 'short' })}
                              </span>
                            </div>
                            <Badge variant="outline" className={cn('text-[10px] sm:hidden border', typeConfig.badgeVariant)}>
                              {typeConfig.label}
                            </Badge>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm sm:text-base truncate">{event.titre}</h4>
                              <Badge variant="outline" className={cn('text-xs border hidden sm:inline-flex', typeConfig.badgeVariant)}>
                                {typeConfig.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                {event.journeeEntiere ? (
                                  'Journee'
                                ) : (
                                  <>
                                    {formatTime(event.dateDebut)} - {formatTime(event.dateFin)}
                                  </>
                                )}
                              </span>
                              {event.lieu && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  <span className="truncate max-w-[100px] sm:max-w-none">{event.lieu}</span>
                                </span>
                              )}
                              {event.dossier && (
                                <span className="flex items-center gap-1">
                                  <FolderOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  <span className="truncate max-w-[80px] sm:max-w-none">{event.dossier.reference}</span>
                                  {clientName && (
                                    <span className="text-foreground font-medium hidden sm:inline">({clientName})</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0 self-end sm:self-center">
                            <Button variant="ghost" size="icon" onClick={() => openEditModal(event)} className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
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
                <div className="text-center py-8 sm:py-12">
                  <List className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {searchQuery || filterType !== 'all' || showUnassigned || filterDossier !== 'all' || filterClient !== 'all'
                      ? 'Aucun evenement correspondant'
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
            <EventFormFields formData={formData} setFormData={setFormData} dossiers={dossiers} activeCalendars={activeCalendars} />
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
            <EventFormFields formData={formData} setFormData={setFormData} dossiers={dossiers} activeCalendars={activeCalendars} />
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
    </>
  )
}

EvenementsPage.layout = (page: ReactNode) => getAdminLayout(page)
export default EvenementsPage
