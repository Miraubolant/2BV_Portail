import { Head } from '@inertiajs/react'
import { ClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CLIENT_DASHBOARD_API, formatDateTime } from '@/lib/constants'
import { CLIENT_DOSSIERS, CLIENT_DEMANDES_RDV } from '@/app/routes'
import { useEffect, useState } from 'react'
import { Link } from '@inertiajs/react'
import {
  FolderKanban,
  FolderCheck,
  Bell,
  Calendar,
  Plus,
  LoaderCircle,
} from 'lucide-react'

interface DashboardStats {
  totalDossiers: number
  dossiersEnCours: number
  dossiersClotures: number
  notificationsNonLues: number
}

interface Evenement {
  id: string
  titre: string
  type: string
  dateDebut: string
  lieu: string | null
  dossier: {
    reference: string
    intitule: string
  }
}

interface Notification {
  id: string
  titre: string
  message: string
  type: string
  createdAt: string
}

interface ClientInfo {
  id: string
  nom: string
  prenom: string
}

interface DashboardData {
  client: ClientInfo
  stats: DashboardStats
  evenementsAVenir: Evenement[]
  dernieresNotifications: Notification[]
}

const ClientDashboardPage = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const response = await fetch(CLIENT_DASHBOARD_API, {
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
      <ClientLayout title="Tableau de bord">
        <Head title="Mon espace" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout title="Tableau de bord">
      <Head title="Mon espace" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Bonjour {data?.client.prenom}
            </h1>
            <p className="text-muted-foreground">
              Bienvenue dans votre espace client
            </p>
          </div>
          <Button asChild>
            <Link href={CLIENT_DEMANDES_RDV}>
              <Plus className="mr-2 h-4 w-4" />
              Demander un RDV
            </Link>
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mes dossiers</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.stats.totalDossiers || 0}</div>
              <Link href={CLIENT_DOSSIERS} className="text-xs text-muted-foreground hover:underline">
                Voir mes dossiers
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En cours</CardTitle>
              <FolderKanban className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.stats.dossiersEnCours || 0}</div>
              <p className="text-xs text-muted-foreground">Dossiers actifs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clotures</CardTitle>
              <FolderCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.stats.dossiersClotures || 0}</div>
              <p className="text-xs text-muted-foreground">Dossiers termines</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.stats.notificationsNonLues || 0}</div>
              <p className="text-xs text-muted-foreground">Non lues</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Evenements a venir */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Prochains evenements</CardTitle>
                  <CardDescription>Vos rendez-vous et audiences</CardDescription>
                </div>
                <Calendar className="h-5 w-5 text-muted-foreground" />
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
                        </p>
                        {event.lieu && (
                          <p className="text-xs text-muted-foreground">
                            Lieu: {event.lieu}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Dossier: {event.dossier.reference}
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

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notifications recentes</CardTitle>
                  <CardDescription>Mises a jour de vos dossiers</CardDescription>
                </div>
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {data?.dernieresNotifications && data.dernieresNotifications.length > 0 ? (
                <div className="space-y-4">
                  {data.dernieresNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-medium">{notif.titre}</p>
                        <Badge variant="secondary" className="text-xs">
                          {notif.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notif.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDateTime(notif.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucune notification
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  )
}

export default ClientDashboardPage
