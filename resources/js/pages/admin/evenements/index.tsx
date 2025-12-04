import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ADMIN_EVENEMENTS_API, formatDateTime } from '@/lib/constants'
import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface Evenement {
  id: string
  titre: string
  type: string
  dateDebut: string
  dateFin: string
  lieu: string | null
  description: string | null
  rappelEnvoye: boolean
  dossier: {
    id: string
    reference: string
    client: {
      nom: string
      prenom: string
    }
  }
}

const typeLabels: Record<string, { label: string; color: string }> = {
  audience: { label: 'Audience', color: 'bg-red-500' },
  rdv_client: { label: 'RDV Client', color: 'bg-blue-500' },
  rdv_adverse: { label: 'RDV Adverse', color: 'bg-orange-500' },
  expertise: { label: 'Expertise', color: 'bg-purple-500' },
  mediation: { label: 'Mediation', color: 'bg-green-500' },
  echeance: { label: 'Echeance', color: 'bg-yellow-500' },
  autre: { label: 'Autre', color: 'bg-gray-500' },
}

const EvenementsPage = () => {
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

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

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  // Group events by date
  const eventsByDate = evenements.reduce((acc, event) => {
    const date = new Date(event.dateDebut).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {} as Record<string, Evenement[]>)

  return (
    <AdminLayout title="Evenements">
      <Head title="Evenements" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Evenements</h1>
            <p className="text-muted-foreground">
              Calendrier des evenements du cabinet
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel evenement
          </Button>
        </div>

        {/* Month navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="capitalize">{monthName}</CardTitle>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : evenements.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(eventsByDate)
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([date, events]) => (
                    <div key={date}>
                      <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">
                        {new Date(date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </h3>
                      <div className="space-y-2">
                        {events.map((event) => {
                          const typeConfig = typeLabels[event.type] || typeLabels.autre
                          return (
                            <div
                              key={event.id}
                              className="flex items-start gap-4 rounded-lg border p-4"
                            >
                              <div className={`w-1 h-full min-h-[60px] rounded ${typeConfig.color}`} />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium">{event.titre}</h4>
                                  <Badge variant="outline">{typeConfig.label}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTime(event.dateDebut)}
                                  </span>
                                  {event.lieu && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {event.lieu}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm">
                                  <Link
                                    href={`/admin/dossiers/${event.dossier.id}`}
                                    className="text-primary hover:underline"
                                  >
                                    {event.dossier.reference}
                                  </Link>
                                  {' - '}
                                  {event.dossier.client.prenom} {event.dossier.client.nom}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun evenement ce mois-ci</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default EvenementsPage
