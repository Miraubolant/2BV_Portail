import { Head, Link } from '@inertiajs/react'
import { getAdminLayout } from '@/components/layout/admin-layout'
import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ADMIN_DEMANDES_RDV_API, formatDateTime } from '@/lib/constants'
import { useEffect, useState, useCallback } from 'react'
import {
  Clock,
  Check,
  X,
  LoaderCircle,
  CalendarClock,
  User,
  MapPin,
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface AdminOption {
  id: string
  username: string | null
  nom: string
  prenom: string
}

interface DossierOption {
  id: string
  reference: string
}

interface DemandeRdv {
  id: string
  motif: string
  dateSouhaitee: string | null
  creneau: string | null
  urgence: string | null
  statut: 'en_attente' | 'accepte' | 'refuse'
  reponseAdmin: string | null
  createdAt: string
  client: {
    id: string
    nom: string
    prenom: string
    email: string
    telephone: string | null
    responsable?: {
      id: string
      username: string | null
      nom: string
      prenom: string
    } | null
  }
  dossier?: {
    id: string
    reference: string
  }
}

const statutConfig: Record<string, { label: string; variant: 'outline' | 'default' | 'destructive'; icon: typeof Clock }> = {
  en_attente: { label: 'En attente', variant: 'outline', icon: Clock },
  accepte: { label: 'Accepte', variant: 'default', icon: Check },
  refuse: { label: 'Refuse', variant: 'destructive', icon: X },
}

const creneauToTime: Record<string, { debut: string; fin: string }> = {
  matin: { debut: '09:00', fin: '10:00' },
  apres_midi: { debut: '14:00', fin: '15:00' },
  fin_journee: { debut: '17:00', fin: '18:00' },
}

const DemandesRdvPage = () => {
  const [demandes, setDemandes] = useState<DemandeRdv[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDemande, setSelectedDemande] = useState<DemandeRdv | null>(null)
  const [actionType, setActionType] = useState<'accepter' | 'refuser' | null>(null)
  const [reponse, setReponse] = useState('')
  const [processing, setProcessing] = useState(false)
  const [eventData, setEventData] = useState({
    dateDebut: '',
    heureDebut: '09:00',
    dateFin: '',
    heureFin: '10:00',
    lieu: 'Cabinet',
  })

  // Filters
  const [responsables, setResponsables] = useState<AdminOption[]>([])
  const [dossiers, setDossiers] = useState<DossierOption[]>([])
  const [responsableFilter, setResponsableFilter] = useState('')
  const [dossierFilter, setDossierFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchFilters = async () => {
    try {
      const response = await fetch(`${ADMIN_DEMANDES_RDV_API}/filters`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setResponsables(result.responsables || [])
        setDossiers(result.dossiers || [])
      }
    } catch (error) {
      console.error('Error fetching filters:', error)
    }
  }

  const fetchDemandes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (responsableFilter) params.append('responsableId', responsableFilter)
      if (dossierFilter) params.append('dossierId', dossierFilter)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const url = params.toString() ? `${ADMIN_DEMANDES_RDV_API}?${params}` : ADMIN_DEMANDES_RDV_API
      const response = await fetch(url, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setDemandes(result.data || result || [])
      }
    } catch (error) {
      console.error('Error fetching demandes:', error)
    } finally {
      setLoading(false)
    }
  }, [responsableFilter, dossierFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchFilters()
  }, [])

  useEffect(() => {
    fetchDemandes()
  }, [fetchDemandes])

  const openAcceptDialog = (demande: DemandeRdv) => {
    setSelectedDemande(demande)
    setActionType('accepter')
    setReponse('')

    // Pre-fill date from client's requested date
    const dateStr = demande.dateSouhaitee || new Date().toISOString().split('T')[0]
    const times = demande.creneau ? creneauToTime[demande.creneau] : { debut: '09:00', fin: '10:00' }

    setEventData({
      dateDebut: dateStr,
      heureDebut: times.debut,
      dateFin: dateStr,
      heureFin: times.fin,
      lieu: 'Cabinet',
    })
  }

  const openRefuseDialog = (demande: DemandeRdv) => {
    setSelectedDemande(demande)
    setActionType('refuser')
    setReponse('')
  }

  const closeDialog = () => {
    setSelectedDemande(null)
    setActionType(null)
    setReponse('')
  }

  const handleAccept = async () => {
    if (!selectedDemande || !eventData.dateDebut) return
    setProcessing(true)
    try {
      const dateDebut = `${eventData.dateDebut}T${eventData.heureDebut}:00`
      const dateFin = `${eventData.dateFin || eventData.dateDebut}T${eventData.heureFin}:00`

      const response = await fetch(`${ADMIN_DEMANDES_RDV_API}/${selectedDemande.id}/accepter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dateDebut,
          dateFin,
          lieu: eventData.lieu,
          reponse,
        }),
      })
      if (response.ok) {
        closeDialog()
        fetchDemandes()
      } else {
        const error = await response.json()
        alert(error.message || 'Erreur lors de l\'acceptation')
      }
    } catch (error) {
      console.error('Error accepting demande:', error)
      alert('Erreur lors de l\'acceptation')
    } finally {
      setProcessing(false)
    }
  }

  const handleRefuse = async () => {
    if (!selectedDemande) return
    setProcessing(true)
    try {
      const response = await fetch(`${ADMIN_DEMANDES_RDV_API}/${selectedDemande.id}/refuser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ motif: reponse }),
      })
      if (response.ok) {
        closeDialog()
        fetchDemandes()
      } else {
        const error = await response.json()
        alert(error.message || 'Erreur lors du refus')
      }
    } catch (error) {
      console.error('Error refusing demande:', error)
      alert('Erreur lors du refus')
    } finally {
      setProcessing(false)
    }
  }

  const enAttente = demandes.filter((d) => d.statut === 'en_attente')
  const traitees = demandes.filter((d) => d.statut !== 'en_attente')

  return (
    <>
      <Head title="Demandes de RDV" />

      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <CalendarClock className="h-6 w-6 sm:h-8 sm:w-8" />
            Demandes de RDV
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestion des demandes de rendez-vous clients
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-4">
                <Select value={responsableFilter || 'all'} onValueChange={(v) => setResponsableFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="none">Sans responsable</SelectItem>
                    {responsables.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.username || `${admin.prenom} ${admin.nom}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={dossierFilter || 'all'} onValueChange={(v) => setDossierFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Dossier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous dossiers</SelectItem>
                    {dossiers.map((dossier) => (
                      <SelectItem key={dossier.id} value={dossier.id}>
                        {dossier.reference}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 sm:gap-4 items-center">
                <Input
                  type="date"
                  className="flex-1 sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Date debut"
                />
                <Input
                  type="date"
                  className="flex-1 sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Date fin"
                />
                {(responsableFilter || dossierFilter || dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                    onClick={() => {
                      setResponsableFilter('')
                      setDossierFilter('')
                      setDateFrom('')
                      setDateTo('')
                    }}
                    title="Effacer les filtres"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* En attente */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  En attente ({enAttente.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {enAttente.length > 0 ? (
                  <div className="space-y-4">
                    {enAttente.map((demande) => (
                      <div
                        key={demande.id}
                        className="rounded-lg border p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <Link
                              href={`/admin/clients/${demande.client.id}`}
                              className="font-medium hover:underline"
                            >
                              {demande.client.prenom} {demande.client.nom}
                            </Link>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(demande.createdAt)}
                          </span>
                        </div>

                        <div>
                          <p className="font-medium">{demande.motif}</p>
                          {demande.dateSouhaitee && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <CalendarClock className="h-3 w-3" />
                              Date souhaitee: {demande.dateSouhaitee}
                              {demande.creneau && ` (${demande.creneau})`}
                            </p>
                          )}
                          {demande.urgence && demande.urgence !== 'normal' && (
                            <Badge variant="destructive" className="mt-1">Urgent</Badge>
                          )}
                        </div>

                        {demande.dossier && (
                          <p className="text-sm">
                            Dossier:{' '}
                            <Link
                              href={`/admin/dossiers/${demande.dossier.id}`}
                              className="text-primary hover:underline"
                            >
                              {demande.dossier.reference}
                            </Link>
                          </p>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => openAcceptDialog(demande)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRefuseDialog(demande)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune demande en attente
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Traitees */}
            <Card>
              <CardHeader>
                <CardTitle>Historique</CardTitle>
              </CardHeader>
              <CardContent>
                {traitees.length > 0 ? (
                  <div className="space-y-4">
                    {traitees.slice(0, 10).map((demande) => {
                      const config = statutConfig[demande.statut] || { label: demande.statut, variant: 'outline' as const }
                      return (
                        <div
                          key={demande.id}
                          className="rounded-lg border p-4 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {demande.client.prenom} {demande.client.nom}
                            </span>
                            <Badge variant={config.variant}>{config.label}</Badge>
                          </div>
                          <p className="text-sm">{demande.motif}</p>
                          {demande.reponseAdmin && (
                            <p className="text-sm text-muted-foreground">
                              Reponse: {demande.reponseAdmin}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(demande.createdAt)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune demande traitee
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Accept Dialog */}
      <Dialog open={actionType === 'accepter'} onOpenChange={() => closeDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Accepter la demande de RDV</DialogTitle>
            <DialogDescription>
              Demande de {selectedDemande?.client.prenom} {selectedDemande?.client.nom}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium text-sm">{selectedDemande?.motif}</p>
              {selectedDemande?.dateSouhaitee && (
                <p className="text-xs text-muted-foreground mt-1">
                  Souhaite: {selectedDemande.dateSouhaitee}
                  {selectedDemande.creneau && ` (${selectedDemande.creneau})`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateDebut">Date du RDV *</Label>
                <Input
                  id="dateDebut"
                  type="date"
                  value={eventData.dateDebut}
                  onChange={(e) => setEventData({ ...eventData, dateDebut: e.target.value, dateFin: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lieu">Lieu</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lieu"
                    value={eventData.lieu}
                    onChange={(e) => setEventData({ ...eventData, lieu: e.target.value })}
                    className="pl-9"
                    placeholder="Cabinet"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="heureDebut">Heure debut *</Label>
                <Input
                  id="heureDebut"
                  type="time"
                  value={eventData.heureDebut}
                  onChange={(e) => setEventData({ ...eventData, heureDebut: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heureFin">Heure fin *</Label>
                <Input
                  id="heureFin"
                  type="time"
                  value={eventData.heureFin}
                  onChange={(e) => setEventData({ ...eventData, heureFin: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reponseAccept">Message de confirmation (optionnel)</Label>
              <Textarea
                id="reponseAccept"
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                placeholder="Message envoye au client..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
            <Button onClick={handleAccept} disabled={processing || !eventData.dateDebut}>
              {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Accepter et creer le RDV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refuse Dialog */}
      <Dialog open={actionType === 'refuser'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande de RDV</DialogTitle>
            <DialogDescription>
              Demande de {selectedDemande?.client.prenom} {selectedDemande?.client.nom}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="font-medium text-sm">{selectedDemande?.motif}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reponseRefuse">Motif du refus (optionnel)</Label>
              <Textarea
                id="reponseRefuse"
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                placeholder="Expliquez au client pourquoi la demande est refusee..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRefuse} disabled={processing}>
              {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Refuser la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

DemandesRdvPage.layout = (page: ReactNode) => getAdminLayout(page)
export default DemandesRdvPage
