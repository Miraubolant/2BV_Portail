import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Unlink,
  LoaderCircle,
  AlertTriangle,
  FolderSync,
  User,
} from 'lucide-react'
import {
  GOOGLE_STATUS_API,
  GOOGLE_AUTHORIZE_API,
  GOOGLE_DISCONNECT_API,
  GOOGLE_TEST_API,
  GOOGLE_CALENDARS_API,
  GOOGLE_SELECT_CALENDAR_API,
  GOOGLE_SYNC_API,
  GOOGLE_SYNC_MODE_API,
} from '@/lib/constants'
import { cn } from '@/lib/utils'

interface GoogleCalendarStatus {
  configured: boolean
  connected: boolean
  accountEmail?: string | null
  accountName?: string | null
  selectedCalendarId?: string | null
  selectedCalendarName?: string | null
  syncMode?: string
  message?: string
}

interface CalendarEntry {
  id: string
  summary: string
  description?: string
  primary?: boolean
  backgroundColor?: string
}

export function GoogleCalendarSettings() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null)
  const [calendars, setCalendars] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [selectingCalendar, setSelectingCalendar] = useState(false)
  const [updatingSyncMode, setUpdatingSyncMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleSuccess = params.get('google_success')
    const googleError = params.get('google_error')

    if (googleSuccess) {
      setSuccess('Connexion Google Calendar reussie')
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
    } else if (googleError) {
      setError(decodeURIComponent(googleError))
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations')
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [])

  useEffect(() => {
    if (status?.connected && calendars.length === 0) {
      fetchCalendars()
    }
  }, [status?.connected])

  const fetchStatus = async () => {
    try {
      const response = await fetch(GOOGLE_STATUS_API, { credentials: 'include' })
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

  const fetchCalendars = async () => {
    setLoadingCalendars(true)
    try {
      const response = await fetch(GOOGLE_CALENDARS_API, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setCalendars(data.calendars || [])
      }
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoadingCalendars(false)
    }
  }

  const handleConnect = async () => {
    try {
      setError(null)
      const response = await fetch(GOOGLE_AUTHORIZE_API, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.authUrl
      } else {
        setError('Impossible de se connecter a Google')
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
      const response = await fetch(GOOGLE_TEST_API, { credentials: 'include' })
      const data = await response.json()
      if (data.success) {
        setSuccess(`Connexion operationnelle (${data.calendarsCount} calendrier(s))`)
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
    if (!confirm('Deconnecter Google Calendar ?')) return

    setDisconnecting(true)
    setError(null)
    try {
      const response = await fetch(GOOGLE_DISCONNECT_API, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        setStatus({ configured: status?.configured || false, connected: false })
        setCalendars([])
        setSuccess('Google Calendar deconnecte')
      } else {
        setError('Erreur de deconnexion')
      }
    } catch {
      setError('Erreur de deconnexion')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSelectCalendar = async (calendarId: string) => {
    const calendar = calendars.find((c) => c.id === calendarId)
    if (!calendar) return

    setSelectingCalendar(true)
    setError(null)
    try {
      const response = await fetch(GOOGLE_SELECT_CALENDAR_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          calendarId: calendar.id,
          calendarName: calendar.summary,
        }),
      })
      if (response.ok) {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                selectedCalendarId: calendar.id,
                selectedCalendarName: calendar.summary,
              }
            : null
        )
        setSuccess(`Calendrier selectionne`)
      } else {
        setError('Erreur de selection')
      }
    } catch {
      setError('Erreur de selection')
    } finally {
      setSelectingCalendar(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(GOOGLE_SYNC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pullFromGoogle: true }),
      })
      const data = await response.json()
      if (data.success) {
        const parts = []
        if (data.created > 0) parts.push(`${data.created} cree(s)`)
        if (data.updated > 0) parts.push(`${data.updated} mis a jour`)
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

  const handleSyncModeChange = async (isAuto: boolean) => {
    setUpdatingSyncMode(true)
    setError(null)
    try {
      const response = await fetch(GOOGLE_SYNC_MODE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: isAuto ? 'auto' : 'manual' }),
      })
      const data = await response.json()
      if (response.ok) {
        setStatus((prev) => (prev ? { ...prev, syncMode: data.syncMode } : null))
        setSuccess(isAuto ? 'Mode automatique active' : 'Mode manuel active')
      } else {
        setError(data.message || 'Erreur de configuration')
      }
    } catch {
      setError('Erreur de configuration')
    } finally {
      setUpdatingSyncMode(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Google Calendar</CardTitle>
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
      <CardContent className="space-y-4">
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
              Ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env
            </AlertDescription>
          </Alert>
        )}

        {status?.configured && !status?.connected && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connectez Google Calendar pour synchroniser les evenements.
            </p>
            <Button onClick={handleConnect} size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connecter Google Calendar
            </Button>
          </div>
        )}

        {status?.connected && (
          <div className="space-y-4">
            {/* Compte connecte */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{status.accountName || 'Compte Google'}</p>
                <p className="text-xs text-muted-foreground truncate">{status.accountEmail}</p>
              </div>
            </div>

            {/* Selection du calendrier */}
            <div className="space-y-2">
              <Label className="text-xs">Calendrier</Label>
              {loadingCalendars ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <LoaderCircle className="h-3 w-3 animate-spin" />
                  Chargement...
                </div>
              ) : (
                <Select
                  value={status.selectedCalendarId || ''}
                  onValueChange={handleSelectCalendar}
                  disabled={selectingCalendar}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selectionner un calendrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        <div className="flex items-center gap-2">
                          {cal.backgroundColor && (
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: cal.backgroundColor }}
                            />
                          )}
                          <span className="truncate">{cal.summary}</span>
                          {cal.primary && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              Principal
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Mode de synchronisation */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="sync-mode" className="text-sm font-medium">
                  Synchronisation auto
                </Label>
                <p className="text-xs text-muted-foreground">
                  {status.syncMode === 'auto'
                    ? 'Synchronisation bidirectionnelle active'
                    : 'Synchronisation manuelle uniquement'}
                </p>
              </div>
              <Switch
                id="sync-mode"
                checked={status.syncMode === 'auto'}
                onCheckedChange={handleSyncModeChange}
                disabled={updatingSyncMode}
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing}
                className="h-8 text-xs"
              >
                {testing ? <LoaderCircle className="mr-1.5 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1.5 h-3 w-3" />}
                Tester
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing || !status.selectedCalendarId}
                className="h-8 text-xs"
              >
                {syncing ? <LoaderCircle className="mr-1.5 h-3 w-3 animate-spin" /> : <FolderSync className="mr-1.5 h-3 w-3" />}
                Synchroniser
              </Button>
            </div>

            {/* Deconnecter */}
            <Button
              variant="ghost"
              size="sm"
              className={cn('w-full h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10')}
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? <LoaderCircle className="mr-1.5 h-3 w-3 animate-spin" /> : <Unlink className="mr-1.5 h-3 w-3" />}
              Deconnecter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
