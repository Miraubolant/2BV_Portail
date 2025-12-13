import { Head } from '@inertiajs/react'
import { getClientLayout } from '@/components/layout/client-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { CLIENT_DEMANDES_RDV_API, CLIENT_DOSSIERS_API, formatDateTime } from '@/lib/constants'
import { type ReactNode, useEffect, useState, useCallback } from 'react'
import {
  Clock,
  Check,
  X,
  LoaderCircle,
  Plus,
  CalendarClock,
  FolderKanban,
  AlertCircle,
} from 'lucide-react'

interface DemandeRdv {
  id: string
  motif: string
  dateSouhaitee: string | null
  creneau: string | null
  urgence: string | null
  statut: 'en_attente' | 'accepte' | 'refuse'
  reponseAdmin: string | null
  createdAt: string
  dossier?: {
    id: string
    reference: string
    intitule: string
  }
  evenement?: {
    id: string
    titre: string
    dateDebut: string
    dateFin: string
    lieu: string | null
  }
}

interface Dossier {
  id: string
  reference: string
  intitule: string
}

const statutConfig = {
  en_attente: { label: 'En attente', variant: 'outline' as const, icon: Clock },
  accepte: { label: 'Acceptee', variant: 'default' as const, icon: Check },
  refuse: { label: 'Refusee', variant: 'destructive' as const, icon: X },
}

const creneauLabels: Record<string, string> = {
  matin: 'Matin (9h-12h)',
  apres_midi: 'Apres-midi (14h-17h)',
  fin_journee: 'Fin de journee (17h-19h)',
}

const urgenceLabels: Record<string, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
  tres_urgent: 'Tres urgent',
}

const DemandesRdvClientPage = () => {
  const [demandes, setDemandes] = useState<DemandeRdv[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    dossierId: '',
    dateSouhaitee: '',
    creneau: 'matin',
    motif: '',
    urgence: 'normal',
  })

  const fetchDemandes = useCallback(async () => {
    try {
      const response = await fetch(CLIENT_DEMANDES_RDV_API, {
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
  }, [])

  const fetchDossiers = useCallback(async () => {
    try {
      const response = await fetch(CLIENT_DOSSIERS_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setDossiers(result.data || result || [])
      }
    } catch (error) {
      console.error('Error fetching dossiers:', error)
    }
  }, [])

  useEffect(() => {
    fetchDemandes()
    fetchDossiers()
  }, [fetchDemandes, fetchDossiers])

  const handleCreate = async () => {
    if (!formData.motif || formData.motif.length < 10) {
      alert('Le motif doit contenir au moins 10 caracteres')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/client/demande-rdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          dossierId: formData.dossierId || undefined,
        }),
      })

      if (response.ok) {
        setShowCreateModal(false)
        setFormData({
          dossierId: '',
          dateSouhaitee: '',
          creneau: 'matin',
          motif: '',
          urgence: 'normal',
        })
        fetchDemandes()
      } else {
        const error = await response.json()
        alert(error.message || 'Erreur lors de la creation de la demande')
      }
    } catch (error) {
      console.error('Error creating demande:', error)
      alert('Erreur lors de la creation de la demande')
    } finally {
      setCreating(false)
    }
  }

  const enAttente = demandes.filter((d) => d.statut === 'en_attente')
  const traitees = demandes.filter((d) => d.statut !== 'en_attente')

  return (
    <>
      <Head title="Mes demandes de RDV" />

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Demandes de RDV</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerez vos demandes de rendez-vous avec le cabinet
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto text-sm h-9">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle demande
          </Button>
        </div>

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
                <CardDescription className="text-xs sm:text-sm">
                  Demandes en cours de traitement par le cabinet
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {enAttente.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {enAttente.map((demande) => (
                      <div
                        key={demande.id}
                        className="rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="outline" className="flex items-center gap-1 text-[10px] sm:text-xs">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            En attente
                          </Badge>
                          <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                            {formatDateTime(demande.createdAt)}
                          </span>
                        </div>

                        <div>
                          <p className="font-medium text-sm sm:text-base line-clamp-2">{demande.motif}</p>
                          {demande.dateSouhaitee && (
                            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <CalendarClock className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">
                                Date: {new Date(demande.dateSouhaitee).toLocaleDateString('fr-FR')}
                                {demande.creneau && ` (${creneauLabels[demande.creneau] || demande.creneau})`}
                              </span>
                            </p>
                          )}
                          {demande.urgence && demande.urgence !== 'normal' && (
                            <Badge variant="destructive" className="mt-1 flex items-center gap-1 w-fit text-[10px] sm:text-xs">
                              <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {urgenceLabels[demande.urgence] || demande.urgence}
                            </Badge>
                          )}
                        </div>

                        {demande.dossier && (
                          <p className="text-xs sm:text-sm flex items-center gap-1">
                            <FolderKanban className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">Dossier: {demande.dossier.reference}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                    Aucune demande en attente
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Historique */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Historique</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Demandes traitees par le cabinet
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {traitees.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {traitees.map((demande) => {
                      const config = statutConfig[demande.statut]
                      const StatusIcon = config.icon
                      return (
                        <div
                          key={demande.id}
                          className="rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant={config.variant} className="flex items-center gap-1 text-[10px] sm:text-xs">
                              <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {config.label}
                            </Badge>
                            <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                              {formatDateTime(demande.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm line-clamp-2">{demande.motif}</p>

                          {demande.reponseAdmin && (
                            <div className="bg-muted/50 rounded-md p-2 sm:p-3">
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                <span className="font-medium">Reponse:</span>{' '}
                                {demande.reponseAdmin}
                              </p>
                            </div>
                          )}

                          {demande.evenement && (
                            <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-2 sm:p-3">
                              <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">
                                RDV confirme
                              </p>
                              <p className="text-xs sm:text-sm text-green-600 dark:text-green-500 truncate">
                                {demande.evenement.titre} - {formatDateTime(demande.evenement.dateDebut)}
                              </p>
                              {demande.evenement.lieu && (
                                <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-500 truncate">
                                  Lieu: {demande.evenement.lieu}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                    Aucune demande traitee
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal de creation */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Nouvelle demande de RDV</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Remplissez le formulaire ci-dessous pour demander un rendez-vous.
              Le cabinet vous repondra dans les meilleurs delais.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="dossier" className="text-xs sm:text-sm">Dossier concerne (optionnel)</Label>
              <Select
                value={formData.dossierId || 'none'}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, dossierId: value === 'none' ? '' : value }))}
              >
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue placeholder="Selectionnez un dossier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs sm:text-sm">Aucun dossier specifique</SelectItem>
                  {dossiers.map((dossier) => (
                    <SelectItem key={dossier.id} value={dossier.id} className="text-xs sm:text-sm">
                      {dossier.reference} - {dossier.intitule}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="dateSouhaitee" className="text-xs sm:text-sm">Date souhaitee</Label>
                <Input
                  id="dateSouhaitee"
                  type="date"
                  value={formData.dateSouhaitee}
                  onChange={(e) => setFormData({ ...formData, dateSouhaitee: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="creneau" className="text-xs sm:text-sm">Creneau</Label>
                <Select
                  value={formData.creneau}
                  onValueChange={(value) => setFormData({ ...formData, creneau: value })}
                >
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matin" className="text-xs sm:text-sm">Matin</SelectItem>
                    <SelectItem value="apres_midi" className="text-xs sm:text-sm">Apres-midi</SelectItem>
                    <SelectItem value="fin_journee" className="text-xs sm:text-sm">Fin de journee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="urgence" className="text-xs sm:text-sm">Niveau d'urgence</Label>
              <Select
                value={formData.urgence}
                onValueChange={(value) => setFormData({ ...formData, urgence: value })}
              >
                <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal" className="text-xs sm:text-sm">Normal</SelectItem>
                  <SelectItem value="urgent" className="text-xs sm:text-sm">Urgent</SelectItem>
                  <SelectItem value="tres_urgent" className="text-xs sm:text-sm">Tres urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="motif" className="text-xs sm:text-sm">Motif de la demande *</Label>
              <Textarea
                id="motif"
                value={formData.motif}
                onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                placeholder="Decrivez le motif de votre demande..."
                rows={3}
                className="text-xs sm:text-sm resize-none"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {formData.motif.length}/10 caracteres minimum
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="w-full sm:w-auto h-9 text-xs sm:text-sm">
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating || formData.motif.length < 10} className="w-full sm:w-auto h-9 text-xs sm:text-sm">
              {creating && <LoaderCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

DemandesRdvClientPage.layout = (page: ReactNode) => getClientLayout(page)

export default DemandesRdvClientPage
