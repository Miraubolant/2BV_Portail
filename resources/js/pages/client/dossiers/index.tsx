import { Head, Link } from '@inertiajs/react'
import { getClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CLIENT_DOSSIERS_API, formatDate } from '@/lib/constants'
import { ReactNode, useEffect, useState } from 'react'
import {
  FolderKanban,
  Calendar,
  FileText,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Dossier {
  id: string
  reference: string
  intitule: string
  description: string | null
  typeAffaire: string | null
  statut: string
  dateOuverture: string | null
  juridiction: string | null
  numeroRg: string | null
}

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

const ClientDossiersPage = () => {
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('en_cours')

  useEffect(() => {
    fetchDossiers()
  }, [activeTab])

  const fetchDossiers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'tous') {
        params.append('statut', activeTab)
      }

      const response = await fetch(`${CLIENT_DOSSIERS_API}?${params}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setDossiers(result.data || [])
      }
    } catch (error) {
      console.error('Error fetching dossiers:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head title="Mes dossiers" />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mes dossiers</h1>
          <p className="text-muted-foreground">
            Consultez l'etat de vos dossiers en cours
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="en_cours">En cours</TabsTrigger>
            <TabsTrigger value="cloture">Clotures</TabsTrigger>
            <TabsTrigger value="tous">Tous</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : dossiers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dossiers.map((dossier) => {
                  const config = statutLabels[dossier.statut] || {
                    label: dossier.statut,
                    variant: 'outline' as const,
                  }
                  return (
                    <Card key={dossier.id} className="transition-shadow hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{dossier.reference}</CardTitle>
                            <CardDescription className="line-clamp-2">
                              {dossier.intitule}
                            </CardDescription>
                          </div>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {dossier.typeAffaire && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FolderKanban className="h-4 w-4" />
                            <span>{dossier.typeAffaire}</span>
                          </div>
                        )}
                        {dossier.dateOuverture && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Ouvert le {formatDate(dossier.dateOuverture)}</span>
                          </div>
                        )}
                        {dossier.juridiction && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>
                              {dossier.juridiction}
                              {dossier.numeroRg && ` - RG: ${dossier.numeroRg}`}
                            </span>
                          </div>
                        )}
                        <Button variant="outline" className="w-full" asChild>
                          <Link href={`/espace-client/dossiers/${dossier.id}`}>
                            Voir le detail
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FolderKanban className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-lg font-medium">Aucun dossier</p>
                  <p className="text-sm text-muted-foreground">
                    Vous n'avez pas de dossier dans cette categorie
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

ClientDossiersPage.layout = (page: ReactNode) => getClientLayout(page)

export default ClientDossiersPage
