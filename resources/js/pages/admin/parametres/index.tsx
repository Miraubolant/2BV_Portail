import { Head } from '@inertiajs/react'
import { getAdminLayout } from '@/components/layout/admin-layout'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { ADMIN_PARAMETRES_API } from '@/lib/constants'
import { useEffect, useState, useCallback } from 'react'
import {
  Building,
  Mail,
  LoaderCircle,
  Save,
  Bell,
  Lock,
  Plus,
  X,
  FolderKanban,
  Calendar,
  Filter,
  Settings,
  Check,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { OneDriveSettings } from '@/components/admin/onedrive-settings'
import { GoogleCalendarSettings } from '@/components/admin/google-calendar-settings'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface Parametres {
  [key: string]: string | null
}

interface NotificationSettings {
  notifEmailDocument: boolean
  emailNotification: string | null
  filterByResponsable: boolean
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
    filterByResponsable: false,
  })
  const [initialNotifSettings, setInitialNotifSettings] = useState<NotificationSettings>({
    notifEmailDocument: true,
    emailNotification: null,
    filterByResponsable: false,
  })
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
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
  const [initialTypesSettings, setInitialTypesSettings] = useState<TypesSettings>({
    dossierTypes: [],
    evenementTypes: [],
  })
  const [newDossierType, setNewDossierType] = useState('')
  const [newEvenementType, setNewEvenementType] = useState('')

  const isSuperAdmin = userRole === 'super_admin'

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    const notifChanged =
      notifSettings.notifEmailDocument !== initialNotifSettings.notifEmailDocument ||
      notifSettings.emailNotification !== initialNotifSettings.emailNotification ||
      notifSettings.filterByResponsable !== initialNotifSettings.filterByResponsable

    const typesChanged =
      JSON.stringify(typesSettings.dossierTypes) !== JSON.stringify(initialTypesSettings.dossierTypes) ||
      JSON.stringify(typesSettings.evenementTypes) !== JSON.stringify(initialTypesSettings.evenementTypes)

    return notifChanged || typesChanged
  }, [notifSettings, initialNotifSettings, typesSettings, initialTypesSettings])

  useEffect(() => {
    fetchNotificationSettings()
  }, [])

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
        const params: Parametres = {}
        let dossierTypes: string[] = []
        let evenementTypes: string[] = []

        if (typeof result === 'object' && result !== null) {
          Object.values(result).forEach((category: any) => {
            if (Array.isArray(category)) {
              category.forEach((p: any) => {
                params[p.cle] = p.valeur
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
        setInitialTypesSettings({ dossierTypes: [...dossierTypes], evenementTypes: [...evenementTypes] })
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
          const settings = {
            notifEmailDocument: result.user.notifEmailDocument ?? true,
            emailNotification: result.user.emailNotification || null,
            filterByResponsable: result.user.filterByResponsable ?? false,
          }
          setNotifSettings(settings)
          setInitialNotifSettings({ ...settings })
        }
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
    } finally {
      setLoading(false)
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

  const handleSaveAll = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      // Save notification settings
      await fetch('/api/admin/auth/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(notifSettings),
      })
      setInitialNotifSettings({ ...notifSettings })

      // Save types (for super_admin only, shared across cabinet)
      if (isSuperAdmin) {
        const parametresArray = Object.entries(parametres).map(([cle, valeur]) => ({
          cle,
          valeur,
        }))
        // Add types to parametres
        parametresArray.push(
          { cle: 'dossier_types_affaire', valeur: JSON.stringify(typesSettings.dossierTypes) },
          { cle: 'evenement_types', valeur: JSON.stringify(typesSettings.evenementTypes) }
        )
        await fetch(ADMIN_PARAMETRES_API, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ parametres: parametresArray }),
        })
        setInitialTypesSettings({
          dossierTypes: [...typesSettings.dossierTypes],
          evenementTypes: [...typesSettings.evenementTypes],
        })
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Error saving settings:', error)
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

  const formatTypeName = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  if (loading) {
    return (
      <>
        <Head title="Parametres" />
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  return (
    <>
      <Head title="Parametres" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Settings className="h-8 w-8" />
              Parametres
            </h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Configuration du cabinet et preferences personnelles' : 'Mes preferences'}
            </p>
          </div>
          <Button onClick={handleSaveAll} disabled={saving}>
            {saveSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Enregistre
              </>
            ) : saving ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>

        <Tabs defaultValue="preferences">
          <TabsList className="grid w-full grid-cols-1 lg:w-auto lg:grid-cols-none lg:flex">
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="integrations" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Integrations</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Preferences Tab - Notifications + Display + Types */}
          <TabsContent value="preferences" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Personal Settings */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Email nouveaux documents</Label>
                      <p className="text-xs text-muted-foreground">
                        Quand un client ajoute un document
                      </p>
                    </div>
                    <Switch
                      checked={notifSettings.notifEmailDocument}
                      onCheckedChange={(checked) =>
                        setNotifSettings((prev) => ({ ...prev, notifEmailDocument: checked }))
                      }
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="emailNotification" className="text-sm">Email de notification</Label>
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
                      placeholder="Votre email de connexion par defaut"
                      className="h-9"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Display Settings */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Affichage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Filtrer par responsable</Label>
                      <p className="text-xs text-muted-foreground">
                        Afficher uniquement vos dossiers, clients et evenements
                      </p>
                    </div>
                    <Switch
                      checked={notifSettings.filterByResponsable}
                      onCheckedChange={(checked) =>
                        setNotifSettings((prev) => ({ ...prev, filterByResponsable: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Types Section - Only for Super Admin */}
            {isSuperAdmin && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderKanban className="h-4 w-4" />
                    Types personnalises
                  </CardTitle>
                  <CardDescription>
                    Definissez les types disponibles pour le cabinet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Dossier Types */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Types de dossiers</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newDossierType}
                          onChange={(e) => setNewDossierType(e.target.value)}
                          placeholder="Nouveau type..."
                          className="h-9"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddDossierType()
                            }
                          }}
                        />
                        <Button onClick={handleAddDossierType} size="sm" variant="outline" className="h-9 px-3">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                        {typesSettings.dossierTypes.map((type) => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="gap-1 pr-1"
                          >
                            {formatTypeName(type)}
                            <button
                              onClick={() => handleRemoveDossierType(type)}
                              className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {typesSettings.dossierTypes.length === 0 && (
                          <span className="text-xs text-muted-foreground">Aucun type defini</span>
                        )}
                      </div>
                    </div>

                    {/* Event Types */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Types d'evenements</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newEvenementType}
                          onChange={(e) => setNewEvenementType(e.target.value)}
                          placeholder="Nouveau type..."
                          className="h-9"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddEvenementType()
                            }
                          }}
                        />
                        <Button onClick={handleAddEvenementType} size="sm" variant="outline" className="h-9 px-3">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                        {typesSettings.evenementTypes.map((type) => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="gap-1 pr-1"
                          >
                            {formatTypeName(type)}
                            <button
                              onClick={() => handleRemoveEvenementType(type)}
                              className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {typesSettings.evenementTypes.length === 0 && (
                          <span className="text-xs text-muted-foreground">Aucun type defini</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Securite
                </CardTitle>
              </CardHeader>
              <CardContent>
                {passwordError && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive mb-4">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600 mb-4">
                    Mot de passe modifie avec succes
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }} className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-sm">Mot de passe actuel</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-sm">Nouveau mot de passe</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">Minimum 8 caracteres</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm">Confirmer</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingPassword} size="sm">
                    {savingPassword ? 'Modification...' : 'Modifier le mot de passe'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Cabinet Section - Super Admin Only */}
            {isSuperAdmin && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Informations du cabinet
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="cabinet_nom" className="text-sm">Nom</Label>
                        <Input
                          id="cabinet_nom"
                          value={parametres.cabinet_nom || ''}
                          onChange={(e) => handleChange('cabinet_nom', e.target.value)}
                          placeholder="Cabinet d'Avocats"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cabinet_email" className="text-sm">Email</Label>
                        <Input
                          id="cabinet_email"
                          type="email"
                          value={parametres.cabinet_email || ''}
                          onChange={(e) => handleChange('cabinet_email', e.target.value)}
                          placeholder="contact@cabinet.fr"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="cabinet_telephone" className="text-sm">Telephone</Label>
                        <Input
                          id="cabinet_telephone"
                          value={parametres.cabinet_telephone || ''}
                          onChange={(e) => handleChange('cabinet_telephone', e.target.value)}
                          placeholder="01 23 45 67 89"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cabinet_fax" className="text-sm">Fax</Label>
                        <Input
                          id="cabinet_fax"
                          value={parametres.cabinet_fax || ''}
                          onChange={(e) => handleChange('cabinet_fax', e.target.value)}
                          placeholder="01 23 45 67 90"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cabinet_adresse" className="text-sm">Adresse</Label>
                      <Textarea
                        id="cabinet_adresse"
                        value={parametres.cabinet_adresse || ''}
                        onChange={(e) => handleChange('cabinet_adresse', e.target.value)}
                        placeholder="123 rue du Barreau&#10;75001 Paris"
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Configuration email
                    </CardTitle>
                    <CardDescription>
                      Expediteur des emails automatiques
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email_from_address" className="text-sm">Email expediteur</Label>
                      <Input
                        id="email_from_address"
                        type="email"
                        value={parametres.email_from_address || ''}
                        onChange={(e) => handleChange('email_from_address', e.target.value)}
                        placeholder="noreply@cabinet.fr"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email_from_name" className="text-sm">Nom expediteur</Label>
                      <Input
                        id="email_from_name"
                        value={parametres.email_from_name || ''}
                        onChange={(e) => handleChange('email_from_name', e.target.value)}
                        placeholder="Cabinet d'Avocats"
                        className="h-9"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Integrations Tab - Super Admin Only */}
          {isSuperAdmin && (
            <TabsContent value="integrations" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <OneDriveSettings />
                <GoogleCalendarSettings />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </>
  )
}

ParametresPage.layout = (page: ReactNode) => getAdminLayout(page)
export default ParametresPage
