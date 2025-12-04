import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ADMIN_PARAMETRES_API } from '@/lib/constants'
import { useEffect, useState } from 'react'
import {
  Building,
  Mail,
  Cloud,
  LoaderCircle,
  Save,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface Parametres {
  [key: string]: string | null
}

const ParametresPage = () => {
  const [parametres, setParametres] = useState<Parametres>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchParametres()
  }, [])

  const fetchParametres = async () => {
    try {
      const response = await fetch(ADMIN_PARAMETRES_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        // Backend returns grouped by category: { cabinet: [...], email: [...] }
        const params: Parametres = {}
        if (typeof result === 'object' && result !== null) {
          // Flatten all categories into a single object
          Object.values(result).forEach((category: any) => {
            if (Array.isArray(category)) {
              category.forEach((p: any) => {
                params[p.cle] = p.valeur
              })
            }
          })
        }
        setParametres(params)
      }
    } catch (error) {
      console.error('Error fetching parametres:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setParametres((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convert object to array format expected by backend
      const parametresArray = Object.entries(parametres).map(([cle, valeur]) => ({
        cle,
        valeur,
      }))
      const response = await fetch(ADMIN_PARAMETRES_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parametres: parametresArray }),
      })
      if (response.ok) {
        alert('Parametres sauvegardes')
      }
    } catch (error) {
      console.error('Error saving parametres:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Parametres">
        <Head title="Parametres" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Parametres">
      <Head title="Parametres" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Parametres</h1>
            <p className="text-muted-foreground">
              Configuration du cabinet
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>

        <Tabs defaultValue="cabinet">
          <TabsList>
            <TabsTrigger value="cabinet">Cabinet</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="cabinet" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Informations du cabinet
                </CardTitle>
                <CardDescription>
                  Ces informations apparaissent sur le portail client
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cabinet_nom">Nom du cabinet</Label>
                    <Input
                      id="cabinet_nom"
                      value={parametres.cabinet_nom || ''}
                      onChange={(e) => handleChange('cabinet_nom', e.target.value)}
                      placeholder="Cabinet d'Avocats"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cabinet_email">Email de contact</Label>
                    <Input
                      id="cabinet_email"
                      type="email"
                      value={parametres.cabinet_email || ''}
                      onChange={(e) => handleChange('cabinet_email', e.target.value)}
                      placeholder="contact@cabinet.fr"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cabinet_telephone">Telephone</Label>
                    <Input
                      id="cabinet_telephone"
                      value={parametres.cabinet_telephone || ''}
                      onChange={(e) => handleChange('cabinet_telephone', e.target.value)}
                      placeholder="01 23 45 67 89"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cabinet_fax">Fax</Label>
                    <Input
                      id="cabinet_fax"
                      value={parametres.cabinet_fax || ''}
                      onChange={(e) => handleChange('cabinet_fax', e.target.value)}
                      placeholder="01 23 45 67 90"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cabinet_adresse">Adresse</Label>
                  <Textarea
                    id="cabinet_adresse"
                    value={parametres.cabinet_adresse || ''}
                    onChange={(e) => handleChange('cabinet_adresse', e.target.value)}
                    placeholder="123 rue du Barreau&#10;75001 Paris"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Configuration email
                </CardTitle>
                <CardDescription>
                  Configuration pour l'envoi d'emails aux clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email_from_address">Email expediteur</Label>
                  <Input
                    id="email_from_address"
                    type="email"
                    value={parametres.email_from_address || ''}
                    onChange={(e) => handleChange('email_from_address', e.target.value)}
                    placeholder="noreply@cabinet.fr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_from_name">Nom expediteur</Label>
                  <Input
                    id="email_from_name"
                    value={parametres.email_from_name || ''}
                    onChange={(e) => handleChange('email_from_name', e.target.value)}
                    placeholder="Cabinet d'Avocats"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  OneDrive / Microsoft
                </CardTitle>
                <CardDescription>
                  Synchronisation des documents avec OneDrive
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configuration disponible prochainement
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Google Calendar
                </CardTitle>
                <CardDescription>
                  Synchronisation du calendrier avec Google
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configuration disponible prochainement
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}

export default ParametresPage
