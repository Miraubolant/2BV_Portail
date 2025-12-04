import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ADMIN_DEMANDES_RDV_API, formatDateTime } from '@/lib/constants'
import { useEffect, useState, useCallback } from 'react'
import {
  Clock,
  Check,
  X,
  LoaderCircle,
  CalendarClock,
  User,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface DemandeRdv {
  id: string
  motif: string
  dateSouhaitee: string | null
  creneau: string | null
  urgence: string | null
  statut: 'en_attente' | 'acceptee' | 'refusee'
  reponseAdmin: string | null
  createdAt: string
  client: {
    id: string
    nom: string
    prenom: string
    email: string
    telephone: string | null
  }
  dossier?: {
    id: string
    reference: string
  }
}

const statutConfig = {
  en_attente: { label: 'En attente', variant: 'outline' as const, icon: Clock },
  acceptee: { label: 'Acceptee', variant: 'default' as const, icon: Check },
  refusee: { label: 'Refusee', variant: 'destructive' as const, icon: X },
}

const DemandesRdvPage = () => {
  const [demandes, setDemandes] = useState<DemandeRdv[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDemande, setSelectedDemande] = useState<DemandeRdv | null>(null)
  const [reponse, setReponse] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchDemandes = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(ADMIN_DEMANDES_RDV_API, {
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

  useEffect(() => {
    fetchDemandes()
  }, [fetchDemandes])

  const handleAccept = async () => {
    if (!selectedDemande) return
    setProcessing(true)
    try {
      const response = await fetch(`${ADMIN_DEMANDES_RDV_API}/${selectedDemande.id}/accepter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reponse }),
      })
      if (response.ok) {
        setSelectedDemande(null)
        setReponse('')
        fetchDemandes()
      }
    } catch (error) {
      console.error('Error accepting demande:', error)
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
        body: JSON.stringify({ reponse }),
      })
      if (response.ok) {
        setSelectedDemande(null)
        setReponse('')
        fetchDemandes()
      }
    } catch (error) {
      console.error('Error refusing demande:', error)
    } finally {
      setProcessing(false)
    }
  }

  const enAttente = demandes.filter((d) => d.statut === 'en_attente')
  const traitees = demandes.filter((d) => d.statut !== 'en_attente')

  return (
    <AdminLayout title="Demandes de RDV">
      <Head title="Demandes de RDV" />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Demandes de RDV</h1>
          <p className="text-muted-foreground">
            Gestion des demandes de rendez-vous clients
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* En attente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  En attente ({enAttente.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                          {demande.urgence && demande.urgence !== 'normale' && (
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
                            onClick={() => setSelectedDemande(demande)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDemande(demande)}
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
                      const config = statutConfig[demande.statut]
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

      {/* Response Dialog */}
      <Dialog open={!!selectedDemande} onOpenChange={() => setSelectedDemande(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repondre a la demande</DialogTitle>
            <DialogDescription>
              Demande de {selectedDemande?.client.prenom} {selectedDemande?.client.nom}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{selectedDemande?.motif}</p>
              {selectedDemande?.dateSouhaitee && (
                <p className="text-sm text-muted-foreground mt-1">
                  Date: {selectedDemande.dateSouhaitee}
                  {selectedDemande.creneau && ` (${selectedDemande.creneau})`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reponse">Message de reponse (optionnel)</Label>
              <Textarea
                id="reponse"
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                placeholder="Votre reponse au client..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDemande(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRefuse} disabled={processing}>
              Refuser
            </Button>
            <Button onClick={handleAccept} disabled={processing}>
              Accepter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}

export default DemandesRdvPage
