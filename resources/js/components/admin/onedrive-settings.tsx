import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Cloud,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Unlink,
  LoaderCircle,
  HardDrive,
  AlertTriangle,
  FolderSync,
  FolderPlus,
  FolderDown,
} from 'lucide-react'
import {
  MICROSOFT_STATUS_API,
  MICROSOFT_AUTHORIZE_API,
  MICROSOFT_DISCONNECT_API,
  MICROSOFT_TEST_API,
  MICROSOFT_INITIALIZE_API,
  MICROSOFT_SYNC_API,
  MICROSOFT_REVERSE_SYNC_API,
} from '@/lib/constants'

interface OneDriveStatus {
  configured: boolean
  connected: boolean
  accountEmail?: string | null
  accountName?: string | null
  message?: string
}

interface DriveInfo {
  driveType: string
  quota: {
    used: number
    total: number
    remaining: number
  }
}

export function OneDriveSettings() {
  const [status, setStatus] = useState<OneDriveStatus | null>(null)
  const [driveInfo, setDriveInfo] = useState<DriveInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [reverseSyncing, setReverseSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check for URL params (after OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oneDriveSuccess = params.get('onedrive_success')
    const oneDriveError = params.get('onedrive_error')

    if (oneDriveSuccess) {
      setSuccess('OneDrive connecte avec succes!')
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (oneDriveError) {
      setError(decodeURIComponent(oneDriveError))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch(MICROSOFT_STATUS_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Error fetching OneDrive status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setError(null)
      const response = await fetch(MICROSOFT_AUTHORIZE_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        // Redirect to Microsoft OAuth
        window.location.href = data.authUrl
      } else {
        setError('Impossible d\'initier la connexion OneDrive')
      }
    } catch (err) {
      setError('Erreur lors de la connexion')
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(MICROSOFT_TEST_API, {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        setSuccess('Connexion OneDrive fonctionnelle!')
        setDriveInfo(data.driveInfo)
      } else {
        setError(data.message || 'Test echoue')
      }
    } catch (err) {
      setError('Erreur lors du test')
    } finally {
      setTesting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Etes-vous sur de vouloir deconnecter OneDrive?')) {
      return
    }

    setDisconnecting(true)
    setError(null)
    try {
      const response = await fetch(MICROSOFT_DISCONNECT_API, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        setStatus({ configured: status?.configured || false, connected: false })
        setDriveInfo(null)
        setSuccess('OneDrive deconnecte')
      } else {
        setError('Erreur lors de la deconnexion')
      }
    } catch (err) {
      setError('Erreur lors de la deconnexion')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleInitialize = async () => {
    setInitializing(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(MICROSOFT_INITIALIZE_API, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        setSuccess(`Initialisation terminee: ${data.created} dossiers crees`)
      } else {
        setError(data.message || 'Erreur lors de l\'initialisation')
      }
    } catch (err) {
      setError('Erreur lors de l\'initialisation')
    } finally {
      setInitializing(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(MICROSOFT_SYNC_API, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        setSuccess(`Synchronisation terminee: ${data.created} crees, ${data.updated} mis a jour, ${data.deleted} supprimes`)
      } else {
        setError(data.message || 'Erreur lors de la synchronisation')
      }
    } catch (err) {
      setError('Erreur lors de la synchronisation')
    } finally {
      setSyncing(false)
    }
  }

  const handleReverseSync = async () => {
    setReverseSyncing(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(MICROSOFT_REVERSE_SYNC_API, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        let message = `Import OneDrive termine: ${data.created} fichiers importes`
        if (data.linkedDossiers > 0) {
          message += `, ${data.linkedDossiers} dossiers lies`
        }
        if (data.unmatchedClients?.length > 0 || data.unmatchedDossiers?.length > 0) {
          message += ` (${data.unmatchedClients?.length || 0} clients et ${data.unmatchedDossiers?.length || 0} dossiers non reconnus)`
        }
        setSuccess(message)
      } else {
        setError(data.message || 'Erreur lors de l\'import')
      }
    } catch (err) {
      setError('Erreur lors de l\'import OneDrive')
    } finally {
      setReverseSyncing(false)
    }
  }

  const formatBytes = (bytes: number) => {
    const units = ['o', 'Ko', 'Mo', 'Go', 'To']
    let size = bytes
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            OneDrive / Microsoft
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            <CardTitle>OneDrive / Microsoft</CardTitle>
          </div>
          {status?.connected ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connecte
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="mr-1 h-3 w-3" />
              Non connecte
            </Badge>
          )}
        </div>
        <CardDescription>
          Synchronisation automatique des documents avec OneDrive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500 bg-green-50 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {!status?.configured && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              OneDrive n'est pas configure. Ajoutez MICROSOFT_CLIENT_ID et MICROSOFT_CLIENT_SECRET
              dans votre fichier .env
            </AlertDescription>
          </Alert>
        )}

        {status?.configured && !status?.connected && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connectez votre compte Microsoft pour synchroniser automatiquement les documents
              avec OneDrive.
            </p>
            <Button onClick={handleConnect}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Connecter OneDrive
            </Button>
          </div>
        )}

        {status?.connected && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <HardDrive className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{status.accountName || 'Compte Microsoft'}</p>
                  <p className="text-sm text-muted-foreground">{status.accountEmail}</p>
                </div>
              </div>

              {driveInfo && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Espace utilise</span>
                    <span>{formatBytes(driveInfo.quota.used)} / {formatBytes(driveInfo.quota.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(driveInfo.quota.used / driveInfo.quota.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(driveInfo.quota.remaining)} disponible
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <p className="font-medium mb-2">Structure des dossiers OneDrive:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                /Portail Cabinet/Clients/[Nom Client]/[Ref Dossier] - [Intitule]/
              </code>
              <p className="text-muted-foreground mt-2">
                Les documents sont automatiquement uploades dans le dossier du dossier correspondant.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                {testing ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Tester la connexion
              </Button>
              <Button variant="outline" size="sm" onClick={handleInitialize} disabled={initializing}>
                {initializing ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="mr-2 h-4 w-4" />
                )}
                Initialiser les dossiers
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                {syncing ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FolderSync className="mr-2 h-4 w-4" />
                )}
                Synchroniser
              </Button>
              <Button variant="outline" size="sm" onClick={handleReverseSync} disabled={reverseSyncing}>
                {reverseSyncing ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FolderDown className="mr-2 h-4 w-4" />
                )}
                Importer depuis OneDrive
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="mr-2 h-4 w-4" />
                )}
                Deconnecter
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
