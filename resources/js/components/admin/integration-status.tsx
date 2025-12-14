import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Cloud,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  LoaderCircle,
} from 'lucide-react'
import { INTEGRATIONS_HEALTH_API, INTEGRATIONS_HEALTH_CHECK_API } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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

  const fetchHealth = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? `${INTEGRATIONS_HEALTH_API}?refresh=true` : INTEGRATIONS_HEALTH_API
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setReport(data)
      }
    } catch (err) {
      console.error('Erreur lors du chargement:', err)
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
      console.error('Erreur lors de la verification:', err)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(() => fetchHealth(), 120000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  const getStatusConfig = (integration: IntegrationInfo) => {
    if (!integration.configured) {
      return {
        icon: AlertCircle,
        color: 'text-slate-400',
        label: 'Non configure',
        labelClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
      }
    }
    if (!integration.connected) {
      return {
        icon: XCircle,
        color: 'text-amber-500',
        label: 'Deconnecte',
        labelClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      }
    }
    if (!integration.healthy) {
      return {
        icon: XCircle,
        color: 'text-red-500',
        label: 'Erreur',
        labelClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      }
    }
    return {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      label: 'Connecte',
      labelClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header avec badge global */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Etat des services</h3>
          {report?.overallHealthy ? (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
              Tout operationnel
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
              Attention requise
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={performHealthCheck}
          disabled={checking}
          className="h-8 px-2"
        >
          <RefreshCw className={cn('h-4 w-4', checking && 'animate-spin')} />
        </Button>
      </div>

      {/* Cards des integrations */}
      <div className="grid gap-3 sm:grid-cols-2">
        {report?.integrations.map((integration) => {
          const config = getStatusConfig(integration)
          const Icon = integration.type === 'onedrive' ? Cloud : Calendar
          const StatusIcon = config.icon

          return (
            <div
              key={integration.type}
              className="rounded-xl border p-4 transition-all bg-muted/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-slate-900 shadow-sm">
                    <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{integration.name}</p>
                    {integration.connected && integration.accountEmail && (
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {integration.accountEmail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={cn('h-4 w-4', config.color)} />
                  <Badge variant="outline" className={cn('text-xs border-0', config.labelClass)}>
                    {config.label}
                  </Badge>
                </div>
              </div>

              {/* Infos supplementaires */}
              {integration.connected && integration.details && (
                <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                  {integration.type === 'onedrive' && integration.details.quotaTotal && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Stockage</span>
                        <span className="font-medium">
                          {Math.round((integration.details.quotaUsed || 0) / 1073741824 * 10) / 10} Go
                          {' / '}
                          {Math.round((integration.details.quotaTotal || 0) / 1073741824)} Go
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(integration.details.quotaPercentage || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {integration.type === 'google_calendar' && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Calendrier</span>
                      <span className="font-medium truncate max-w-[120px]">
                        {integration.details.selectedCalendarName || 'Non selectionne'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {integration.error && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{integration.error}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
