import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Cloud,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LoaderCircle,
  Activity,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { INTEGRATIONS_HEALTH_API, INTEGRATIONS_HEALTH_CHECK_API } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface IntegrationInfo {
  name: string
  type: 'onedrive' | 'google_calendar'
  configured: boolean
  connected: boolean
  healthy: boolean
  lastHealthCheck: string | null
  accountEmail?: string | null
  accountName?: string | null
  error?: string
  details?: {
    quotaUsed?: number
    quotaTotal?: number
    quotaPercentage?: number
    calendarsCount?: number
    selectedCalendarId?: string
    selectedCalendarName?: string
    syncMode?: string
  }
}

interface HealthReport {
  timestamp: string
  overallHealthy: boolean
  integrations: IntegrationInfo[]
}

interface Props {
  onRefresh?: () => void
}

export function IntegrationStatus({ onRefresh }: Props) {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? `${INTEGRATIONS_HEALTH_API}?refresh=true` : INTEGRATIONS_HEALTH_API
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setReport(data)
        setError(null)
      }
    } catch (err) {
      console.error('Error fetching integration health:', err)
      setError('Unable to load integration status')
    } finally {
      setLoading(false)
    }
  }, [])

  const performHealthCheck = async () => {
    setChecking(true)
    try {
      await fetch(INTEGRATIONS_HEALTH_CHECK_API, {
        method: 'POST',
        credentials: 'include',
      })
      await fetchHealth(true)
      onRefresh?.()
    } catch (err) {
      console.error('Error performing health check:', err)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Auto-refresh every 2 minutes
    const interval = setInterval(() => fetchHealth(), 120000)
    return () => clearInterval(interval)
  }, [fetchHealth])

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Jamais'
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date)
  }

  const getStatusIcon = (integration: IntegrationInfo) => {
    if (!integration.configured) return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
    if (!integration.connected) return <WifiOff className="h-4 w-4 text-muted-foreground" />
    if (!integration.healthy) return <XCircle className="h-4 w-4 text-destructive" />
    return <CheckCircle2 className="h-4 w-4 text-green-500" />
  }

  const getStatusBadge = (integration: IntegrationInfo) => {
    if (!integration.configured) {
      return <Badge variant="outline" className="text-muted-foreground">Non configure</Badge>
    }
    if (!integration.connected) {
      return <Badge variant="secondary">Non connecte</Badge>
    }
    if (!integration.healthy) {
      return <Badge variant="destructive">Erreur</Badge>
    }
    return <Badge className="bg-green-500 hover:bg-green-600">Operationnel</Badge>
  }

  const getIcon = (type: 'onedrive' | 'google_calendar') => {
    if (type === 'onedrive') return <Cloud className="h-5 w-5" />
    return <Calendar className="h-5 w-5" />
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

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle className="text-lg">Etat des integrations</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {report?.overallHealthy ? (
              <Badge className="bg-green-500 hover:bg-green-600 gap-1">
                <Wifi className="h-3 w-3" />
                Tout operationnel
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Attention requise
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={performHealthCheck}
              disabled={checking}
            >
              <RefreshCw className={cn('h-4 w-4', checking && 'animate-spin')} />
            </Button>
          </div>
        </div>
        {report?.timestamp && (
          <CardDescription className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Derniere verification: {formatDate(report.timestamp)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {report?.integrations.map((integration) => (
          <div
            key={integration.type}
            className={cn(
              'rounded-lg border p-3 transition-colors',
              integration.healthy && integration.connected
                ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
                : integration.error
                  ? 'border-destructive/50 bg-destructive/5'
                  : 'bg-muted/30'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getIcon(integration.type)}
                <span className="font-medium text-sm">{integration.name}</span>
              </div>
              {getStatusBadge(integration)}
            </div>

            {integration.connected && (
              <div className="space-y-2 text-xs text-muted-foreground">
                {integration.accountEmail && (
                  <p>{integration.accountName || integration.accountEmail}</p>
                )}

                {/* OneDrive quota */}
                {integration.type === 'onedrive' && integration.details?.quotaTotal && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Stockage</span>
                      <span>
                        {formatBytes(integration.details.quotaUsed || 0)} / {formatBytes(integration.details.quotaTotal)}
                      </span>
                    </div>
                    <Progress
                      value={integration.details.quotaPercentage || 0}
                      className="h-1.5"
                    />
                  </div>
                )}

                {/* Google Calendar info */}
                {integration.type === 'google_calendar' && integration.details && (
                  <div className="space-y-1">
                    {integration.details.selectedCalendarName && (
                      <p>Calendrier: <span className="text-foreground">{integration.details.selectedCalendarName}</span></p>
                    )}
                    <p>
                      Mode: <span className="text-foreground">
                        {integration.details.syncMode === 'auto' ? 'Automatique' : 'Manuel'}
                      </span>
                    </p>
                  </div>
                )}

                {integration.error && (
                  <p className="text-destructive">{integration.error}</p>
                )}
              </div>
            )}

            {!integration.configured && (
              <p className="text-xs text-muted-foreground">
                Configurez les variables d'environnement pour activer cette integration
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
