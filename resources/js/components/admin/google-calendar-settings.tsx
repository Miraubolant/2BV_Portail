import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  ChevronDown,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  GOOGLE_STATUS_API,
  GOOGLE_AUTHORIZE_API,
  GOOGLE_DISCONNECT_API,
  GOOGLE_TEST_API,
  GOOGLE_ACCOUNTS_API,
  GOOGLE_SYNC_MULTI_API,
  GOOGLE_PULL_ALL_API,
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
  calendarId: string
  calendarName: string
  calendarColor: string | null
  isActive: boolean
}

interface GoogleApiCalendar {
  id: string
  summary: string
  backgroundColor?: string
  primary?: boolean
}

interface ConnectedAccount {
  id: string
  accountEmail: string | null
  accountName: string | null
  syncMode: string
  calendars: CalendarEntry[]
}

export function GoogleCalendarSettings() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null)
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [updatingSyncMode, setUpdatingSyncMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [loadingCalendars, setLoadingCalendars] = useState<string | null>(null)
  const [availableCalendars, setAvailableCalendars] = useState<Record<string, GoogleApiCalendar[]>>({})
  const [togglingCalendar, setTogglingCalendar] = useState<string | null>(null)
  const [removingAccount, setRemovingAccount] = useState<string | null>(null)

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
    fetchAccounts()
  }, [])

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

  const fetchAccounts = async () => {
    try {
      const response = await fetch(GOOGLE_ACCOUNTS_API, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        // Auto-expand first account if there's only one
        if (data.accounts?.length === 1) {
          setExpandedAccounts(new Set([data.accounts[0].id]))
        }
      }
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const fetchCalendarsForAccount = async (tokenId: string) => {
    setLoadingCalendars(tokenId)
    try {
      const response = await fetch(`${GOOGLE_ACCOUNTS_API}/${tokenId}/calendars`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setAvailableCalendars((prev) => ({ ...prev, [tokenId]: data.calendars || [] }))
      }
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoadingCalendars(null)
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

  const handleRemoveAccount = async (tokenId: string) => {
    if (!confirm('Supprimer ce compte Google et tous ses calendriers ?')) return

    setRemovingAccount(tokenId)
    setError(null)
    try {
      const response = await fetch(`${GOOGLE_ACCOUNTS_API}/${tokenId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== tokenId))
        setSuccess('Compte supprime')
        fetchStatus() // Refresh status
      } else {
        setError('Erreur de suppression')
      }
    } catch {
      setError('Erreur de suppression')
    } finally {
      setRemovingAccount(null)
    }
  }

  const handleToggleCalendar = async (tokenId: string, calendar: GoogleApiCalendar, isActive: boolean) => {
    const calKey = `${tokenId}-${calendar.id}`
    setTogglingCalendar(calKey)
    setError(null)

    try {
      if (isActive) {
        // Activate calendar
        const response = await fetch(`${GOOGLE_ACCOUNTS_API}/${tokenId}/calendars/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            calendarId: calendar.id,
            calendarName: calendar.summary,
            calendarColor: calendar.backgroundColor,
          }),
        })
        if (response.ok) {
          const data = await response.json()
          // Update local state
          setAccounts((prev) =>
            prev.map((a) =>
              a.id === tokenId
                ? { ...a, calendars: [...a.calendars.filter((c) => c.calendarId !== calendar.id), data.calendar] }
                : a
            )
          )
        } else {
          setError('Erreur d\'activation')
        }
      } else {
        // Deactivate calendar
        const account = accounts.find((a) => a.id === tokenId)
        const existingCal = account?.calendars.find((c) => c.calendarId === calendar.id)
        if (existingCal) {
          const response = await fetch(`${GOOGLE_ACCOUNTS_API.replace('/accounts', '')}/calendars/${existingCal.id}/deactivate`, {
            method: 'POST',
            credentials: 'include',
          })
          if (response.ok) {
            setAccounts((prev) =>
              prev.map((a) =>
                a.id === tokenId
                  ? { ...a, calendars: a.calendars.map((c) => c.id === existingCal.id ? { ...c, isActive: false } : c) }
                  : a
              )
            )
          } else {
            setError('Erreur de desactivation')
          }
        }
      }
    } catch {
      setError('Erreur de mise a jour')
    } finally {
      setTogglingCalendar(null)
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
    if (!confirm('Deconnecter tous les comptes Google Calendar ?')) return

    setError(null)
    try {
      const response = await fetch(GOOGLE_DISCONNECT_API, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        setStatus({ configured: status?.configured || false, connected: false })
        setAccounts([])
        setSuccess('Google Calendar deconnecte')
      } else {
        setError('Erreur de deconnexion')
      }
    } catch {
      setError('Erreur de deconnexion')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setSuccess(null)
    try {
      // Use multi-calendar sync if we have active calendars
      const hasActiveCalendars = accounts.some((a) => a.calendars.some((c) => c.isActive))
      const url = hasActiveCalendars ? GOOGLE_SYNC_MULTI_API : GOOGLE_PULL_ALL_API

      const response = await fetch(url, {
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

  const toggleAccountExpanded = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
      // Fetch calendars if not already loaded
      if (!availableCalendars[accountId]) {
        fetchCalendarsForAccount(accountId)
      }
    }
    setExpandedAccounts(newExpanded)
  }

  const isCalendarActive = (tokenId: string, googleCalendarId: string) => {
    const account = accounts.find((a) => a.id === tokenId)
    return account?.calendars.some((c) => c.calendarId === googleCalendarId && c.isActive) || false
  }

  const totalActiveCalendars = accounts.reduce((sum, a) => sum + a.calendars.filter((c) => c.isActive).length, 0)

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
            <Calendar className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Google Calendar</CardTitle>
          </div>
          {accounts.length > 0 ? (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
              {accounts.length} compte{accounts.length > 1 ? 's' : ''}
            </Badge>
          ) : status?.connected ? (
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
              Ajoutez GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env
            </AlertDescription>
          </Alert>
        )}

        {status?.configured && accounts.length === 0 && !status?.connected && (
          <div className="space-y-3 flex-1">
            <p className="text-sm text-muted-foreground">
              Connectez Google Calendar pour synchroniser les evenements.
            </p>
            <Button onClick={handleConnect} size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              Connecter Google Calendar
            </Button>
          </div>
        )}

        {(accounts.length > 0 || status?.connected) && (
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Liste des comptes connectes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Comptes connectes</Label>
                {totalActiveCalendars > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {totalActiveCalendars} calendrier{totalActiveCalendars > 1 ? 's' : ''} actif{totalActiveCalendars > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {accounts.map((account) => (
                  <Collapsible
                    key={account.id}
                    open={expandedAccounts.has(account.id)}
                    onOpenChange={() => toggleAccountExpanded(account.id)}
                  >
                    <div className="rounded-lg border bg-muted/30">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                            <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{account.accountName || 'Compte Google'}</p>
                            <p className="text-xs text-muted-foreground truncate">{account.accountEmail}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {account.calendars.filter((c) => c.isActive).length > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                {account.calendars.filter((c) => c.isActive).length} actif
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveAccount(account.id)
                              }}
                              disabled={removingAccount === account.id}
                            >
                              {removingAccount === account.id ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <ChevronDown className={cn(
                              'h-4 w-4 text-muted-foreground transition-transform',
                              expandedAccounts.has(account.id) && 'rotate-180'
                            )} />
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-1 border-t">
                          {loadingCalendars === account.id ? (
                            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                              <LoaderCircle className="h-3 w-3 animate-spin" />
                              Chargement des calendriers...
                            </div>
                          ) : (
                            <div className="space-y-2 pt-2">
                              {(availableCalendars[account.id] || []).map((cal) => {
                                const isActive = isCalendarActive(account.id, cal.id)
                                const calKey = `${account.id}-${cal.id}`
                                return (
                                  <div
                                    key={cal.id}
                                    className="flex items-center gap-3 py-1.5"
                                  >
                                    <Checkbox
                                      id={calKey}
                                      checked={isActive}
                                      disabled={togglingCalendar === calKey}
                                      onCheckedChange={(checked) =>
                                        handleToggleCalendar(account.id, cal, checked as boolean)
                                      }
                                    />
                                    <label
                                      htmlFor={calKey}
                                      className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-0"
                                    >
                                      {cal.backgroundColor && (
                                        <div
                                          className="h-3 w-3 rounded-full shrink-0"
                                          style={{ backgroundColor: cal.backgroundColor }}
                                        />
                                      )}
                                      <span className="truncate">{cal.summary}</span>
                                      {cal.primary && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                                          Principal
                                        </Badge>
                                      )}
                                    </label>
                                    {togglingCalendar === calKey && (
                                      <LoaderCircle className="h-3 w-3 animate-spin text-muted-foreground" />
                                    )}
                                  </div>
                                )
                              })}
                              {(availableCalendars[account.id] || []).length === 0 && (
                                <p className="text-xs text-muted-foreground py-2">
                                  Aucun calendrier disponible
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>

              {/* Bouton ajouter un compte */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnect}
                className="w-full h-9 text-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Ajouter un compte Google
              </Button>
            </div>

            {/* Mode de synchronisation */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label htmlFor="sync-mode" className="text-xs font-medium">
                  Synchronisation automatique
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {status?.syncMode === 'auto'
                    ? 'Synchronisation bidirectionnelle active'
                    : 'Synchronisation manuelle uniquement'}
                </p>
              </div>
              <Switch
                id="sync-mode"
                checked={status?.syncMode === 'auto'}
                onCheckedChange={handleSyncModeChange}
                disabled={updatingSyncMode}
              />
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
                onClick={handleSync}
                disabled={syncing || totalActiveCalendars === 0}
                className="h-9 text-xs"
              >
                {syncing ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FolderSync className="mr-1.5 h-3.5 w-3.5" />}
                Synchroniser
              </Button>
            </div>

            {/* Deconnecter */}
            <Button
              variant="ghost"
              size="sm"
              className={cn('w-full h-9 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10')}
              onClick={handleDisconnect}
            >
              <Unlink className="mr-1.5 h-3.5 w-3.5" />
              Tout deconnecter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
