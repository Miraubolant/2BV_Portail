import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ADMIN_DASHBOARD_API, formatDateTime } from '@/lib/constants'
import { ADMIN_CLIENTS, ADMIN_DOSSIERS, ADMIN_DEMANDES_RDV, ADMIN_EVENEMENTS } from '@/app/routes'
import { useEffect, useState } from 'react'
import { Link } from '@inertiajs/react'
import {
  Users,
  FolderKanban,
  FolderCheck,
  Clock,
  Calendar,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react'

interface DashboardStats {
  totalClients: number
  dossiersEnCours: number
  dossiersClotures: number
  demandesEnAttente: number
}

interface Evenement {
  id: string
  titre: string
  type: string
  dateDebut: string
  dateFin: string
  lieu: string | null
  dossier: {
    reference: string
    client: {
      nom: string
      prenom: string
    }
  }
}

interface Dossier {
  id: string
  reference: string
  intitule: string
  statut: string
  createdAt: string
  client: {
    id: string
    nom: string
    prenom: string
  }
}

interface DashboardData {
  stats: DashboardStats
  evenementsAVenir: Evenement[]
  derniersDossiers: Dossier[]
}

const AdminDashboardPage = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await fetch(ADMIN_DASHBOARD_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Tableau de bord">
        <Head title="Tableau de bord" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Tableau de bord">
      <Head title="Tableau de bord" />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de l'activite du cabinet</p>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.stats.totalClients || 0}</div>
              <Link href={ADMIN_CLIENTS} className="text-xs text-muted-foreground hover:underline">
                Voir tous les clients
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dossiers en cours</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.stats.dossiersEnCours || 0}</div>
              <Link href={ADMIN_DOSSIERS} className="text-xs text-muted-foreground hover:underline">
                Voir les dossiers
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dossiers clotures</CardTitle>
              <FolderCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.stats.dossiersClotures || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demandes RDV</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.stats.demandesEnAttente || 0}</div>
              <Link
                href={ADMIN_DEMANDES_RDV}
                className="text-xs text-muted-foreground hover:underline"
              >
                En attente de traitement
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Evenements a venir */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Evenements a venir</CardTitle>
                  <CardDescription>Les 7 prochains jours</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={ADMIN_EVENEMENTS}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Calendrier
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data?.evenementsAVenir && data.evenementsAVenir.length > 0 ? (
                <div className="space-y-4">
                  {data.evenementsAVenir.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{event.titre}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(event.dateDebut)}
                          {event.lieu && ` - ${event.lieu}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.dossier.reference} - {event.dossier.client.prenom}{' '}
                          {event.dossier.client.nom}
                        </p>
                      </div>
                      <Badge variant="outline">{event.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucun evenement prevu
                </p>
              )}
            </CardContent>
          </Card>

          {/* Derniers dossiers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Derniers dossiers</CardTitle>
                  <CardDescription>Recemment crees</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={ADMIN_DOSSIERS}>
                    Voir tout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data?.derniersDossiers && data.derniersDossiers.length > 0 ? (
                <div className="space-y-4">
                  {data.derniersDossiers.map((dossier) => (
                    <div
                      key={dossier.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <Link
                          href={`/admin/dossiers/${dossier.id}`}
                          className="font-medium hover:underline"
                        >
                          {dossier.reference}
                        </Link>
                        <p className="text-sm text-muted-foreground">{dossier.intitule}</p>
                        <p className="text-xs text-muted-foreground">
                          {dossier.client.prenom} {dossier.client.nom}
                        </p>
                      </div>
                      <Badge
                        variant={dossier.statut === 'nouveau' ? 'default' : 'secondary'}
                      >
                        {dossier.statut}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucun dossier
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboardPage
