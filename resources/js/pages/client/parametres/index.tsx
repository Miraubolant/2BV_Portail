import { Head } from '@inertiajs/react'
import { getClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CLIENT_SETTINGS_API } from '@/lib/constants'
import { ReactNode, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Key,
  Shield,
  Bell,
  LoaderCircle,
  Eye,
  EyeOff,
  QrCode,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SettingsData {
  email: string
  nom: string
  prenom: string
  telephone: string | null
  totpEnabled: boolean
  notifEmailDocument: boolean
  notifEmailEvenement: boolean
}

const ClientParametresPage = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // 2FA state
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpQrCode, setTotpQrCode] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [enablingTotp, setEnablingTotp] = useState(false)

  // Disable 2FA state
  const [disableTotpModalOpen, setDisableTotpModalOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disablingTotp, setDisablingTotp] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch(CLIENT_SETTINGS_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Erreur lors du chargement des parametres')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caracteres')
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch(`${CLIENT_SETTINGS_API}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      if (response.ok) {
        toast.success('Mot de passe modifie avec succes')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erreur lors de la modification')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleEnableTotp = async () => {
    setEnablingTotp(true)
    try {
      const response = await fetch(`${CLIENT_SETTINGS_API}/enable-totp`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setTotpQrCode(data.qrCode)
        setTotpSecret(data.secret)
        setTotpModalOpen(true)
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erreur lors de l\'activation')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setEnablingTotp(false)
    }
  }

  const handleConfirmTotp = async () => {
    if (totpCode.length !== 6) {
      toast.error('Entrez un code a 6 chiffres')
      return
    }

    setEnablingTotp(true)
    try {
      const response = await fetch(`${CLIENT_SETTINGS_API}/confirm-totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: totpCode }),
      })

      if (response.ok) {
        toast.success('Authentification a deux facteurs activee')
        setTotpModalOpen(false)
        setTotpCode('')
        setTotpQrCode(null)
        setTotpSecret(null)
        setSettings((prev) => prev ? { ...prev, totpEnabled: true } : null)
      } else {
        const data = await response.json()
        toast.error(data.message || 'Code invalide')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setEnablingTotp(false)
    }
  }

  const handleDisableTotp = async () => {
    if (disableCode.length !== 6) {
      toast.error('Entrez un code a 6 chiffres')
      return
    }

    setDisablingTotp(true)
    try {
      const response = await fetch(`${CLIENT_SETTINGS_API}/disable-totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode,
        }),
      })

      if (response.ok) {
        toast.success('Authentification a deux facteurs desactivee')
        setDisableTotpModalOpen(false)
        setDisablePassword('')
        setDisableCode('')
        setSettings((prev) => prev ? { ...prev, totpEnabled: false } : null)
      } else {
        const data = await response.json()
        toast.error(data.message || 'Erreur lors de la desactivation')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setDisablingTotp(false)
    }
  }

  const handleNotificationChange = async (field: string, value: boolean) => {
    try {
      const response = await fetch(`${CLIENT_SETTINGS_API}/notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      })

      if (response.ok) {
        setSettings((prev) => prev ? { ...prev, [field]: value } : null)
        toast.success('Preferences mises a jour')
      } else {
        toast.error('Erreur lors de la mise a jour')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Parametres</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerez vos preferences et la securite de votre compte
          </p>
        </div>

        <div className="grid gap-6">
          {/* Changement de mot de passe */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Mot de passe</CardTitle>
                  <CardDescription>
                    Modifiez votre mot de passe de connexion
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input
                    id="newPassword"
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPasswords ? 'Masquer' : 'Afficher'} les mots de passe
                  </button>
                </div>
                <Button type="submit" disabled={changingPassword}>
                  {changingPassword && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                  Modifier le mot de passe
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Authentification a deux facteurs */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Authentification a deux facteurs (2FA)</CardTitle>
                  <CardDescription>
                    Ajoutez une couche de securite supplementaire a votre compte
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">
                    Statut: {settings?.totpEnabled ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-muted-foreground">Desactive</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings?.totpEnabled
                      ? 'Votre compte est protege par l\'authentification a deux facteurs'
                      : 'Activez le 2FA pour securiser davantage votre compte'}
                  </p>
                </div>
                {settings?.totpEnabled ? (
                  <Button
                    variant="destructive"
                    onClick={() => setDisableTotpModalOpen(true)}
                  >
                    Desactiver
                  </Button>
                ) : (
                  <Button onClick={handleEnableTotp} disabled={enablingTotp}>
                    {enablingTotp && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Activer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    Configurez vos preferences de notifications par email
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Nouveaux documents</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir un email lorsqu'un document est ajoute a vos dossiers
                  </p>
                </div>
                <Switch
                  checked={settings?.notifEmailDocument || false}
                  onCheckedChange={(checked) =>
                    handleNotificationChange('notifEmailDocument', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Evenements</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir des rappels pour vos rendez-vous et audiences
                  </p>
                </div>
                <Switch
                  checked={settings?.notifEmailEvenement || false}
                  onCheckedChange={(checked) =>
                    handleNotificationChange('notifEmailEvenement', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal activation 2FA */}
      <Dialog open={totpModalOpen} onOpenChange={setTotpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Activer l'authentification a deux facteurs
            </DialogTitle>
            <DialogDescription>
              Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {totpQrCode && (
              <div className="flex justify-center">
                <img src={totpQrCode} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
            )}
            {totpSecret && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Code manuel:</p>
                <code className="bg-muted px-3 py-1 rounded text-sm font-mono">
                  {totpSecret}
                </code>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="totpCode">Code de verification</Label>
              <Input
                id="totpCode"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTotpModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmTotp} disabled={enablingTotp || totpCode.length !== 6}>
              {enablingTotp && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal desactivation 2FA */}
      <Dialog open={disableTotpModalOpen} onOpenChange={setDisableTotpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactiver l'authentification a deux facteurs</DialogTitle>
            <DialogDescription>
              Pour des raisons de securite, entrez votre mot de passe et un code 2FA valide.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disablePassword">Mot de passe</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disableCode">Code 2FA</Label>
              <Input
                id="disableCode"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableTotpModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableTotp}
              disabled={disablingTotp || !disablePassword || disableCode.length !== 6}
            >
              {disablingTotp && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Desactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

ClientParametresPage.layout = (page: ReactNode) => getClientLayout(page)

export default ClientParametresPage
