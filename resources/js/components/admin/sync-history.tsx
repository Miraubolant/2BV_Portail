import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  History,
  Cloud,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { INTEGRATIONS_SYNC_HISTORY_API } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface SyncEntry {
  id: string
  type: 'onedrive' | 'google_calendar'
  mode: 'auto' | 'manual'
  status: 'success' | 'partial' | 'error'
  itemsProcessed: number
  itemsCreated: number
  itemsUpdated: number
  itemsDeleted: number
  itemsError: number
  message: string
  details?: { logs?: string[] }
  duration: number
  createdAt: string
}

interface Props {
  limit?: number
  compact?: boolean
}

export function SyncHistory({ limit = 20, compact = false }: Props) {
  const [history, setHistory] = useState<SyncEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'onedrive' | 'google_calendar'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const url = filter === 'all'
        ? `${INTEGRATIONS_SYNC_HISTORY_API}?limit=${limit}`
        : `${INTEGRATIONS_SYNC_HISTORY_API}?limit=${limit}&type=${filter}`
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      }
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [filter, limit])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'A l\'instant'
    if (minutes < 60) return `Il y a ${minutes} min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date)
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-500',
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-800',
          badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
          label: 'Succes',
        }
      case 'partial':
        return {
          icon: AlertTriangle,
          color: 'text-amber-500',
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          label: 'Partiel',
        }
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          label: 'Erreur',
        }
      default:
        return {
          icon: Clock,
          color: 'text-slate-500',
          bg: 'bg-slate-50 dark:bg-slate-900/20',
          border: 'border-slate-200 dark:border-slate-800',
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
          label: 'Inconnu',
        }
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
            <History className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base">Historique</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {history.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="onedrive">OneDrive</SelectItem>
                <SelectItem value="google_calendar">Google Calendar</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchHistory}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune synchronisation recente
          </div>
        ) : (
          <ScrollArea className={cn(compact ? 'h-[280px]' : 'h-[360px]')}>
            <div className="space-y-2 pr-4">
              {history.map((entry) => {
                const config = getStatusConfig(entry.status)
                const StatusIcon = config.icon
                const TypeIcon = entry.type === 'onedrive' ? Cloud : Calendar

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      config.bg,
                      config.border
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon className={cn('h-4 w-4 shrink-0', config.color)} />
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TypeIcon className="h-3.5 w-3.5" />
                          <span>{entry.type === 'onedrive' ? 'OneDrive' : 'Google Calendar'}</span>
                          <span className="text-muted-foreground/50">-</span>
                          <span>{entry.mode === 'auto' ? 'Auto' : 'Manuel'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={cn('text-[10px] border-0', config.badge)}>
                          {config.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        >
                          {expandedId === entry.id ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm mt-2 truncate">{entry.message}</p>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(entry.createdAt)}
                      </span>
                      <span>{formatDuration(entry.duration)}</span>
                      {entry.itemsProcessed > 0 && (
                        <span>{entry.itemsProcessed} element{entry.itemsProcessed > 1 ? 's' : ''}</span>
                      )}
                    </div>

                    {expandedId === entry.id && (
                      <div className="mt-3 pt-3 border-t border-current/10 text-xs space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                          <div className="text-center p-2 rounded bg-white/50 dark:bg-slate-900/50">
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400">{entry.itemsCreated}</p>
                            <p className="text-muted-foreground text-[10px]">Crees</p>
                          </div>
                          <div className="text-center p-2 rounded bg-white/50 dark:bg-slate-900/50">
                            <p className="font-semibold text-blue-600 dark:text-blue-400">{entry.itemsUpdated}</p>
                            <p className="text-muted-foreground text-[10px]">Modifies</p>
                          </div>
                          <div className="text-center p-2 rounded bg-white/50 dark:bg-slate-900/50">
                            <p className="font-semibold text-amber-600 dark:text-amber-400">{entry.itemsDeleted}</p>
                            <p className="text-muted-foreground text-[10px]">Supprimes</p>
                          </div>
                          <div className="text-center p-2 rounded bg-white/50 dark:bg-slate-900/50">
                            <p className="font-semibold text-red-600 dark:text-red-400">{entry.itemsError}</p>
                            <p className="text-muted-foreground text-[10px]">Erreurs</p>
                          </div>
                        </div>

                        {entry.details?.logs && entry.details.logs.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium mb-1 text-muted-foreground">Details:</p>
                            <ScrollArea className="h-[80px]">
                              <div className="space-y-0.5 text-muted-foreground font-mono text-[10px]">
                                {entry.details.logs.slice(0, 20).map((log, i) => (
                                  <p key={i}>{log}</p>
                                ))}
                                {entry.details.logs.length > 20 && (
                                  <p className="text-muted-foreground/70">
                                    ... et {entry.details.logs.length - 20} autres
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
