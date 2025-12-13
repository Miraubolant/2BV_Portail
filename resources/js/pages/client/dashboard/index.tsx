import { Head } from '@inertiajs/react'
import { getClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CLIENT_DASHBOARD_API, formatDateTime } from '@/lib/constants'
import { CLIENT_DOSSIERS, CLIENT_DEMANDES_RDV } from '@/app/routes'
import { type ReactNode, useEffect, useState } from 'react'
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
      <>
        <Head title="Mon espace" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  return (
    <>
      <Head title="Mon espace" />

      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Bonjour {data?.client.prenom}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Bienvenue dans votre espace client
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto text-sm h-9">
            <Link href={CLIENT_DEMANDES_RDV}>
              <Plus className="mr-2 h-4 w-4" />
              Demander un RDV
            </Link>
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-2 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Mes dossiers</CardTitle>
              <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{data?.stats.totalDossiers || 0}</div>
              <Link href={CLIENT_DOSSIERS} className="text-[10px] sm:text-xs text-muted-foreground hover:underline">
                Voir mes dossiers
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-2 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">En cours</CardTitle>
              <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{data?.stats.dossiersEnCours || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Dossiers actifs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-2 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Clotures</CardTitle>
              <FolderCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{data?.stats.dossiersClotures || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Dossiers termines</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-2 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Notifications</CardTitle>
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl font-bold">{data?.stats.notificationsNonLues || 0}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Non lues</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Evenements a venir */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">Prochains evenements</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Vos rendez-vous et audiences</CardDescription>
                </div>
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {data?.evenementsAVenir && data.evenementsAVenir.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {data.evenementsAVenir.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start justify-between gap-2 rounded-lg border p-2.5 sm:p-3"
                    >
                      <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{event.titre}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {formatDateTime(event.dateDebut)}
                        </p>
                        {event.lieu && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            Lieu: {event.lieu}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          Dossier: {event.dossier.reference}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] sm:text-xs flex-shrink-0">{event.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                  Aucun evenement prevu
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">Notifications recentes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Mises a jour de vos dossiers</CardDescription>
                </div>
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {data?.dernieresNotifications && data.dernieresNotifications.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {data.dernieresNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="rounded-lg border p-2.5 sm:p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm sm:text-base line-clamp-1">{notif.titre}</p>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
                          {notif.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{notif.message}</p>
                      <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                        {formatDateTime(notif.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                  Aucune notification
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

ClientDashboardPage.layout = (page: ReactNode) => getClientLayout(page)

export default ClientDashboardPage
