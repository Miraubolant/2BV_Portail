import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ADMIN_PARAMETRES_API } from '@/lib/constants'
import { useEffect, useState } from 'react'
import {
  Building,
  Mail,
  Cloud,
  LoaderCircle,
  Save,
  Bell,
  Lock,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface Parametres {
  [key: string]: string | null
}

interface NotificationSettings {
  notifEmailDocument: boolean
  emailNotification: string | null
}

const ParametresPage = () => {
  const [parametres, setParametres] = useState<Parametres>({})
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    notifEmailDocument: true,
    emailNotification: null,
  })
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const isSuperAdmin = userRole === 'super_admin'

  useEffect(() => {
    fetchNotificationSettings()
  }, [])

  // Fetch parametres only for super_admin
  useEffect(() => {
    if (isSuperAdmin) {
      fetchParametres()
    }
  }, [isSuperAdmin])

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
    }
  }

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch('/api/admin/auth/me', {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        if (result.user) {
          setUserRole(result.user.role)
          setNotifSettings({
            notifEmailDocument: result.user.notifEmailDocument ?? true,
            emailNotification: result.user.emailNotification || null,
          })
        }
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSavingNotif(true)
    try {
      await fetch('/api/admin/auth/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(notifSettings),
      })
    } catch (error) {
      console.error('Error saving notification settings:', error)
    } finally {
      setSavingNotif(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setParametres((prev) => ({ ...prev, [key]: value }))
  }

  const handleChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caracteres')
      return
    }

    setSavingPassword(true)
    try {
      const response = await fetch('/api/admin/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(passwordForm),
      })

      if (response.ok) {
        setPasswordSuccess(true)
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const data = await response.json()
        setPasswordError(data.message || 'Erreur lors du changement de mot de passe')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setPasswordError('Erreur lors du changement de mot de passe')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convert object to array format expected by backend
      const parametresArray = Object.entries(parametres).map(([cle, valeur]) => ({
        cle,
        valeur,
      }))
      await fetch(ADMIN_PARAMETRES_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parametres: parametresArray }),
      })
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
              {isSuperAdmin ? 'Configuration du cabinet' : 'Mes preferences'}
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          )}
        </div>

        <Tabs defaultValue="notifications">
          <TabsList>
            <TabsTrigger value="notifications">Mes notifications</TabsTrigger>
            <TabsTrigger value="security">Securite</TabsTrigger>
            {isSuperAdmin && (
              <>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="cabinet">Cabinet</TabsTrigger>
                <TabsTrigger value="integrations">Integrations</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Mes preferences de notification
                </CardTitle>
                <CardDescription>
                  Configurez comment vous souhaitez etre notifie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications par email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir un email quand un client ajoute un document
                    </p>
                  </div>
                  <Switch
                    checked={notifSettings.notifEmailDocument}
                    onCheckedChange={(checked) =>
                      setNotifSettings((prev) => ({ ...prev, notifEmailDocument: checked }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailNotification">Email de notification</Label>
                  <Input
                    id="emailNotification"
                    type="email"
                    value={notifSettings.emailNotification || ''}
                    onChange={(e) =>
                      setNotifSettings((prev) => ({
                        ...prev,
                        emailNotification: e.target.value || null,
                      }))
                    }
                    placeholder="Laisser vide pour utiliser votre email de connexion"
                  />
                  <p className="text-sm text-muted-foreground">
                    Adresse email ou vous recevrez les notifications (optionnel)
                  </p>
                </div>
                <Button onClick={handleSaveNotifications} disabled={savingNotif}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingNotif ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Changer mon mot de passe
                </CardTitle>
                <CardDescription>
                  Modifiez votre mot de passe de connexion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordError && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600">
                    Mot de passe modifie avec succes
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Minimum 8 caracteres
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                    />
                  </div>
                  <Button type="submit" disabled={savingPassword}>
                    <Save className="mr-2 h-4 w-4" />
                    {savingPassword ? 'Modification...' : 'Modifier le mot de passe'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="email" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Configuration email
                  </CardTitle>
                  <CardDescription>
                    Adresse et nom utilises pour l'envoi des emails automatiques
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
                    <p className="text-sm text-muted-foreground">
                      L'adresse qui apparait dans le champ "De:" des emails
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email_from_name">Nom expediteur</Label>
                    <Input
                      id="email_from_name"
                      value={parametres.email_from_name || ''}
                      onChange={(e) => handleChange('email_from_name', e.target.value)}
                      placeholder="Cabinet d'Avocats"
                    />
                    <p className="text-sm text-muted-foreground">
                      Le nom affiche comme expediteur des emails
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isSuperAdmin && (
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
          )}

          {isSuperAdmin && (
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
          )}
        </Tabs>
      </div>
    </AdminLayout>
  )
}

export default ParametresPage
