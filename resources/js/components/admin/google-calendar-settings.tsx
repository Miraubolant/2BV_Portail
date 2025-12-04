import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Unlink,
  LoaderCircle,
  AlertTriangle,
  FolderSync,
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
import { Switch } from '@/components/ui/switch'

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

  // Check for URL params (after OAuth callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleSuccess = params.get('google_success')
    const googleError = params.get('google_error')

    if (googleSuccess) {
      setSuccess('Google Calendar connecte avec succes!')
      // Clean up URL
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
      const response = await fetch(GOOGLE_STATUS_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (err) {
      console.error('Error fetching Google Calendar status:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCalendars = async () => {
    setLoadingCalendars(true)
    try {
      const response = await fetch(GOOGLE_CALENDARS_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setCalendars(data.calendars || [])
      }
    } catch (err) {
      console.error('Error fetching calendars:', err)
    } finally {
      setLoadingCalendars(false)
    }
  }

  const handleConnect = async () => {
    try {
      setError(null)
      const response = await fetch(GOOGLE_AUTHORIZE_API, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        setError("Impossible d'initier la connexion Google")
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
      const response = await fetch(GOOGLE_TEST_API, {
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        setSuccess(`Connexion Google Calendar fonctionnelle! (${data.calendarsCount} calendriers trouves)`)
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
    if (!confirm('Etes-vous sur de vouloir deconnecter Google Calendar?')) {
      return
    }

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
        setError('Erreur lors de la deconnexion')
      }
    } catch (err) {
      setError('Erreur lors de la deconnexion')
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
        setSuccess(`Calendrier "${calendar.summary}" selectionne`)
      } else {
        setError('Erreur lors de la selection du calendrier')
      }
    } catch (err) {
      setError('Erreur lors de la selection du calendrier')
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
        body: JSON.stringify({ pullFromGoogle: true }), // Import events from Google
      })
      const data = await response.json()

      if (data.success) {
        setSuccess(
          `Synchronisation terminee: ${data.created} crees, ${data.updated} mis a jour`
        )
      } else {
        setError(data.message || 'Erreur lors de la synchronisation')
      }
    } catch (err) {
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
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                syncMode: data.syncMode,
              }
            : null
        )
        setSuccess(isAuto ? 'Synchronisation automatique activee' : 'Synchronisation manuelle activee')
      } else {
        setError(data.message || 'Erreur lors du changement de mode')
      }
    } catch (err) {
      setError('Erreur lors du changement de mode')
    } finally {
      setUpdatingSyncMode(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
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
            <Calendar className="h-5 w-5" />
            <CardTitle>Google Calendar</CardTitle>
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
        <CardDescription>Synchronisation des evenements avec Google Calendar</CardDescription>
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
              Google Calendar n'est pas configure. Ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET
              dans votre fichier .env
            </AlertDescription>
          </Alert>
        )}

        {status?.configured && !status?.connected && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connectez votre compte Google pour synchroniser automatiquement les evenements avec
              Google Calendar.
            </p>
            <Button onClick={handleConnect}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Connecter Google Calendar
            </Button>
          </div>
        )}

        {status?.connected && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{status.accountName || 'Compte Google'}</p>
                  <p className="text-sm text-muted-foreground">{status.accountEmail}</p>
                </div>
              </div>
            </div>

            {/* Calendar Selection */}
            <div className="space-y-2">
              <Label>Calendrier de synchronisation</Label>
              {loadingCalendars ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Chargement des calendriers...
                </div>
              ) : (
                <Select
                  value={status.selectedCalendarId || ''}
                  onValueChange={handleSelectCalendar}
                  disabled={selectingCalendar}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un calendrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        <div className="flex items-center gap-2">
                          {cal.backgroundColor && (
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: cal.backgroundColor }}
                            />
                          )}
                          {cal.summary}
                          {cal.primary && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Principal
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {status.selectedCalendarName && (
                <p className="text-xs text-muted-foreground">
                  Calendrier actuel: <strong>{status.selectedCalendarName}</strong>
                </p>
              )}
            </div>

            {/* Sync Mode Toggle */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-mode">Synchronisation automatique</Label>
                  <p className="text-xs text-muted-foreground">
                    Synchronisation bidirectionnelle avec Google Calendar
                  </p>
                </div>
                <Switch
                  id="sync-mode"
                  checked={status.syncMode === 'auto'}
                  onCheckedChange={handleSyncModeChange}
                  disabled={updatingSyncMode}
                />
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
                {status.syncMode === 'auto' ? (
                  <>
                    <p className="font-medium text-foreground">Mode automatique active:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Les evenements du portail sont envoyes vers Google Calendar</li>
                      <li>Les evenements de Google Calendar sont importes automatiquement</li>
                      <li>Si un evenement contient une reference dossier (ex: 2025-001-MIR), il sera associe au dossier correspondant</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">Mode manuel active:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Aucune synchronisation automatique</li>
                      <li>Cochez "Synchroniser avec Google Calendar" lors de la creation d'un evenement pour le synchroniser individuellement</li>
                      <li>Utilisez le bouton "Synchroniser" ci-dessous pour une synchronisation manuelle</li>
                    </ul>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleTest} disabled={testing}>
                {testing ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Tester la connexion
              </Button>
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing || !status.selectedCalendarId}
              >
                {syncing ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FolderSync className="mr-2 h-4 w-4" />
                )}
                Synchroniser maintenant
              </Button>
              <Button
                variant="outline"
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
