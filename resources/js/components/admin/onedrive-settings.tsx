import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Cloud,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Unlink,
  LoaderCircle,
  AlertTriangle,
  FolderSync,
  FolderPlus,
  FolderDown,
  HardDrive,
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
import { cn } from '@/lib/utils'

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oneDriveSuccess = params.get('onedrive_success')
    const oneDriveError = params.get('onedrive_error')

    if (oneDriveSuccess) {
      setSuccess('Connexion OneDrive reussie')
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
    } else if (oneDriveError) {
      setError(decodeURIComponent(oneDriveError))
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [])

  // Auto-fetch drive info when connected
  useEffect(() => {
    if (status?.connected && !driveInfo) {
      fetchDriveInfo()
    }
  }, [status?.connected])

  const fetchStatus = async () => {
    try {
      const response = await fetch(MICROSOFT_STATUS_API, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDriveInfo = async () => {
    try {
      const response = await fetch(MICROSOFT_TEST_API, { credentials: 'include' })
      const data = await response.json()
      if (data.success && data.driveInfo) {
        setDriveInfo(data.driveInfo)
      }
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const handleConnect = async () => {
    try {
      setError(null)
      const response = await fetch(MICROSOFT_AUTHORIZE_API, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.authUrl
      } else {
        setError('Impossible de se connecter a OneDrive')
      }
    } catch {
      setError('Erreur de connexion')
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(MICROSOFT_TEST_API, { credentials: 'include' })
      const data = await response.json()
      if (data.success) {
        setSuccess('Connexion OneDrive operationnelle')
        setDriveInfo(data.driveInfo)
      } else {
        setError(data.message || 'Echec du test')
      }
    } catch {
      setError('Erreur lors du test')
    } finally {
      setTesting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Deconnecter OneDrive ?')) return

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
        setError('Erreur de deconnexion')
      }
    } catch {
      setError('Erreur de deconnexion')
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
        setSuccess(`Structure initialisee: ${data.created} dossier(s) cree(s)`)
      } else {
        setError(data.message || 'Echec de l\'initialisation')
      }
    } catch {
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
        const parts = []
        if (data.created > 0) parts.push(`${data.created} cree(s)`)
        if (data.updated > 0) parts.push(`${data.updated} mis a jour`)
        if (data.deleted > 0) parts.push(`${data.deleted} supprime(s)`)
        setSuccess(parts.length > 0 ? `Synchronisation: ${parts.join(', ')}` : 'Synchronisation terminee')
      } else {
        setError(data.message || 'Echec de la synchronisation')
      }
    } catch {
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
        let msg = `Import: ${data.created} fichier(s)`
        if (data.linkedDossiers > 0) msg += `, ${data.linkedDossiers} dossier(s) lie(s)`
        setSuccess(msg)
      } else {
        setError(data.message || 'Echec de l\'import')
      }
    } catch {
      setError('Erreur lors de l\'import')
    } finally {
      setReverseSyncing(false)
    }
  }

  const formatBytes = (bytes: number) => {
    const gb = bytes / 1073741824
    if (gb >= 1) return `${gb.toFixed(2)} Go`
    const mb = bytes / 1048576
    if (mb >= 1) return `${mb.toFixed(1)} Mo`
    return `${(bytes / 1024).toFixed(0)} Ko`
  }

  const getUsagePercentage = () => {
    if (!driveInfo) return 0
    return Math.round((driveInfo.quota.used / driveInfo.quota.total) * 100)
  }

  const getUsageColor = () => {
    const percentage = getUsagePercentage()
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-amber-500'
    return 'bg-blue-500'
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">OneDrive</CardTitle>
          </div>
          {status?.connected ? (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
              Connecte
            </Badge>
          ) : (
            <Badge variant="secondary">Non connecte</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="py-2 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">{success}</AlertDescription>
          </Alert>
        )}

        {!status?.configured && (
          <Alert className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Ajoutez MICROSOFT_CLIENT_ID et MICROSOFT_CLIENT_SECRET dans .env
            </AlertDescription>
          </Alert>
        )}

        {status?.configured && !status?.connected && (
          <div className="space-y-3 flex-1">
            <p className="text-sm text-muted-foreground">
              Connectez OneDrive pour synchroniser les documents.
            </p>
            <Button onClick={handleConnect} size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connecter OneDrive
            </Button>
          </div>
        )}

        {status?.connected && (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Compte connecte */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{status.accountName || 'Compte Microsoft'}</p>
                <p className="text-xs text-muted-foreground truncate">{status.accountEmail}</p>
              </div>
            </div>

            {/* Stockage */}
            <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Espace de stockage</span>
                {driveInfo && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {getUsagePercentage()}% utilise
                  </span>
                )}
              </div>
              {driveInfo ? (
                <>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', getUsageColor())}
                      style={{ width: `${getUsagePercentage()}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatBytes(driveInfo.quota.used)} utilises</span>
                    <span>{formatBytes(driveInfo.quota.total)} total</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                  Chargement...
                </div>
              )}
            </div>

            {/* Spacer pour aligner les boutons */}
            <div className="flex-1" />

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing}
                className="h-9 text-xs"
              >
                {testing ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                Tester
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleInitialize}
                disabled={initializing}
                className="h-9 text-xs"
              >
                {initializing ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="mr-1.5 h-3.5 w-3.5" />}
                Initialiser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="h-9 text-xs"
              >
                {syncing ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FolderSync className="mr-1.5 h-3.5 w-3.5" />}
                Synchroniser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReverseSync}
                disabled={reverseSyncing}
                className="h-9 text-xs"
              >
                {reverseSyncing ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FolderDown className="mr-1.5 h-3.5 w-3.5" />}
                Importer
              </Button>
            </div>

            {/* Deconnecter */}
            <Button
              variant="ghost"
              size="sm"
              className={cn('w-full h-9 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10')}
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Unlink className="mr-1.5 h-3.5 w-3.5" />}
              Deconnecter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
