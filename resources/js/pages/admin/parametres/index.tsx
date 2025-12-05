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
  LoaderCircle,
  Save,
  Bell,
  Lock,
  Tags,
  Plus,
  X,
  FolderKanban,
  Calendar,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { OneDriveSettings } from '@/components/admin/onedrive-settings'
import { GoogleCalendarSettings } from '@/components/admin/google-calendar-settings'

interface Parametres {
  [key: string]: string | null
}

interface NotificationSettings {
  notifEmailDocument: boolean
  emailNotification: string | null
}

interface TypesSettings {
  dossierTypes: string[]
  evenementTypes: string[]
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
  const [typesSettings, setTypesSettings] = useState<TypesSettings>({
    dossierTypes: [],
    evenementTypes: [],
  })
  const [savingTypes, setSavingTypes] = useState(false)
  const [newDossierType, setNewDossierType] = useState('')
  const [newEvenementType, setNewEvenementType] = useState('')

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
        let dossierTypes: string[] = []
        let evenementTypes: string[] = []

        if (typeof result === 'object' && result !== null) {
          // Flatten all categories into a single object
          Object.values(result).forEach((category: any) => {
            if (Array.isArray(category)) {
              category.forEach((p: any) => {
                params[p.cle] = p.valeur
                // Handle types - backend already parses JSON via typedValue
                if (p.cle === 'dossier_types_affaire' && p.valeur) {
                  if (Array.isArray(p.valeur)) {
                    dossierTypes = p.valeur
                  } else if (typeof p.valeur === 'string') {
                    try {
                      dossierTypes = JSON.parse(p.valeur)
                    } catch (e) {
                      console.error('Error parsing dossier_types_affaire:', e)
                    }
                  }
                }
                if (p.cle === 'evenement_types' && p.valeur) {
                  if (Array.isArray(p.valeur)) {
                    evenementTypes = p.valeur
                  } else if (typeof p.valeur === 'string') {
                    try {
                      evenementTypes = JSON.parse(p.valeur)
                    } catch (e) {
                      console.error('Error parsing evenement_types:', e)
                    }
                  }
                }
              })
            }
          })
        }
        setParametres(params)
        setTypesSettings({ dossierTypes, evenementTypes })
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

  const handleAddDossierType = () => {
    const trimmed = newDossierType.trim().toLowerCase()
    if (trimmed && !typesSettings.dossierTypes.includes(trimmed)) {
      setTypesSettings((prev) => ({
        ...prev,
        dossierTypes: [...prev.dossierTypes, trimmed],
      }))
      setNewDossierType('')
    }
  }

  const handleRemoveDossierType = (type: string) => {
    setTypesSettings((prev) => ({
      ...prev,
      dossierTypes: prev.dossierTypes.filter((t) => t !== type),
    }))
  }

  const handleAddEvenementType = () => {
    const trimmed = newEvenementType.trim().toLowerCase()
    if (trimmed && !typesSettings.evenementTypes.includes(trimmed)) {
      setTypesSettings((prev) => ({
        ...prev,
        evenementTypes: [...prev.evenementTypes, trimmed],
      }))
      setNewEvenementType('')
    }
  }

  const handleRemoveEvenementType = (type: string) => {
    setTypesSettings((prev) => ({
      ...prev,
      evenementTypes: prev.evenementTypes.filter((t) => t !== type),
    }))
  }

  const handleSaveTypes = async () => {
    setSavingTypes(true)
    try {
      const parametresArray = [
        { cle: 'dossier_types_affaire', valeur: JSON.stringify(typesSettings.dossierTypes) },
        { cle: 'evenement_types', valeur: JSON.stringify(typesSettings.evenementTypes) },
      ]
      await fetch(ADMIN_PARAMETRES_API, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ parametres: parametresArray }),
      })
    } catch (error) {
      console.error('Error saving types:', error)
    } finally {
      setSavingTypes(false)
    }
  }

  const formatTypeName = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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
                <TabsTrigger value="cabinet">Information site</TabsTrigger>
                <TabsTrigger value="types">Types</TabsTrigger>
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
            <TabsContent value="types" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    Types de dossiers
                  </CardTitle>
                  <CardDescription>
                    Definissez les types d'affaires disponibles lors de la creation d'un dossier
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newDossierType}
                      onChange={(e) => setNewDossierType(e.target.value)}
                      placeholder="Nouveau type de dossier"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddDossierType()
                        }
                      }}
                    />
                    <Button onClick={handleAddDossierType} size="icon" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typesSettings.dossierTypes.map((type) => (
                      <div
                        key={type}
                        className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                      >
                        <span>{formatTypeName(type)}</span>
                        <button
                          onClick={() => handleRemoveDossierType(type)}
                          className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {typesSettings.dossierTypes.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Aucun type defini. Ajoutez votre premier type ci-dessus.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Types d'evenements
                  </CardTitle>
                  <CardDescription>
                    Definissez les types d'evenements disponibles dans le calendrier
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newEvenementType}
                      onChange={(e) => setNewEvenementType(e.target.value)}
                      placeholder="Nouveau type d'evenement"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddEvenementType()
                        }
                      }}
                    />
                    <Button onClick={handleAddEvenementType} size="icon" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typesSettings.evenementTypes.map((type) => (
                      <div
                        key={type}
                        className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                      >
                        <span>{formatTypeName(type)}</span>
                        <button
                          onClick={() => handleRemoveEvenementType(type)}
                          className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {typesSettings.evenementTypes.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Aucun type defini. Ajoutez votre premier type ci-dessus.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveTypes} disabled={savingTypes}>
                <Save className="mr-2 h-4 w-4" />
                {savingTypes ? 'Sauvegarde...' : 'Sauvegarder les types'}
              </Button>
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="integrations" className="space-y-6">
              <OneDriveSettings />

              <GoogleCalendarSettings />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AdminLayout>
  )
}

export default ParametresPage
