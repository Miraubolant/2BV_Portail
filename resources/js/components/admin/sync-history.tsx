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
  FileText,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
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
    if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms} ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)} sec`
    return `${(ms / 60000).toFixed(1)} min`
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'success':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-950/30',
          border: 'border-emerald-200 dark:border-emerald-900',
          badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
          label: 'Reussi',
        }
      case 'partial':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          border: 'border-amber-200 dark:border-amber-900',
          badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
          label: 'Partiel',
        }
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-950/30',
          border: 'border-red-200 dark:border-red-900',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
          label: 'Echec',
        }
      default:
        return {
          icon: Clock,
          color: 'text-slate-600 dark:text-slate-400',
          bg: 'bg-slate-50 dark:bg-slate-950/30',
          border: 'border-slate-200 dark:border-slate-800',
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-400',
          label: 'Inconnu',
        }
    }
  }

  const getTypeLabel = (type: string) => {
    return type === 'onedrive' ? 'OneDrive' : 'Google Calendar'
  }

  const getModeLabel = (mode: string) => {
    return mode === 'auto' ? 'Automatique' : 'Manuelle'
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
            <CardTitle className="text-base">Historique des synchronisations</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sources</SelectItem>
                <SelectItem value="onedrive">OneDrive</SelectItem>
                <SelectItem value="google_calendar">Google Calendar</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={fetchHistory} title="Actualiser">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">Aucune synchronisation enregistree</p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              Les synchronisations apparaitront ici
            </p>
          </div>
        ) : (
          <ScrollArea className={cn(compact ? 'h-[280px]' : 'h-[400px]')}>
            <div className="space-y-3 pr-4">
              {history.map((entry) => {
                const config = getStatusConfig(entry.status)
                const StatusIcon = config.icon
                const TypeIcon = entry.type === 'onedrive' ? Cloud : Calendar
                const isExpanded = expandedId === entry.id

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'rounded-lg border p-4 transition-all',
                      config.bg,
                      config.border
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn('mt-0.5', config.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              <span>{getTypeLabel(entry.type)}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {getModeLabel(entry.mode)}
                            </Badge>
                            <Badge className={cn('text-[10px] border-0 px-1.5 py-0', config.badge)}>
                              {config.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {entry.message}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(entry.createdAt)}
                      </span>
                      <span>Duree: {formatDuration(entry.duration)}</span>
                      {entry.itemsProcessed > 0 && (
                        <span>{entry.itemsProcessed} element{entry.itemsProcessed > 1 ? 's' : ''} traite{entry.itemsProcessed > 1 ? 's' : ''}</span>
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-current/10">
                        {/* Stats grid */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          <div className="text-center p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-emerald-200/50 dark:border-emerald-800/50">
                            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <Plus className="h-3.5 w-3.5" />
                              <span className="font-bold text-lg">{entry.itemsCreated}</span>
                            </div>
                            <p className="text-muted-foreground text-[10px] mt-0.5">Crees</p>
                          </div>
                          <div className="text-center p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-blue-200/50 dark:border-blue-800/50">
                            <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="font-bold text-lg">{entry.itemsUpdated}</span>
                            </div>
                            <p className="text-muted-foreground text-[10px] mt-0.5">Modifies</p>
                          </div>
                          <div className="text-center p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-amber-200/50 dark:border-amber-800/50">
                            <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="font-bold text-lg">{entry.itemsDeleted}</span>
                            </div>
                            <p className="text-muted-foreground text-[10px] mt-0.5">Supprimes</p>
                          </div>
                          <div className="text-center p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-red-200/50 dark:border-red-800/50">
                            <div className="flex items-center justify-center gap-1 text-red-600 dark:text-red-400">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span className="font-bold text-lg">{entry.itemsError}</span>
                            </div>
                            <p className="text-muted-foreground text-[10px] mt-0.5">Erreurs</p>
                          </div>
                        </div>

                        {/* Logs */}
                        {entry.details?.logs && entry.details.logs.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Journal des operations:
                            </p>
                            <ScrollArea className="h-[100px]">
                              <div className="space-y-1 font-mono text-[11px] text-muted-foreground bg-slate-100 dark:bg-slate-900 rounded-lg p-3">
                                {entry.details.logs.slice(0, 30).map((log, i) => (
                                  <p key={i} className="leading-relaxed">{log}</p>
                                ))}
                                {entry.details.logs.length > 30 && (
                                  <p className="text-muted-foreground/60 italic mt-2">
                                    ... et {entry.details.logs.length - 30} autres lignes
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
