import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      console.error('Error fetching sync history:', err)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500 hover:bg-green-600 text-xs">Succes</Badge>
      case 'partial':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">Partiel</Badge>
      case 'error':
        return <Badge variant="destructive" className="text-xs">Erreur</Badge>
      default:
        return null
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'onedrive' ? (
      <Cloud className="h-3.5 w-3.5" />
    ) : (
      <Calendar className="h-3.5 w-3.5" />
    )
  }

  const getTypeName = (type: string) => {
    return type === 'onedrive' ? 'OneDrive' : 'Google Calendar'
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
            <History className="h-5 w-5" />
            <CardTitle className="text-lg">Historique des synchronisations</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
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
        <CardDescription>
          {history.length} synchronisation{history.length > 1 ? 's' : ''} recente{history.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune synchronisation recente
          </div>
        ) : (
          <ScrollArea className={cn(compact ? 'h-[300px]' : 'h-[400px]')}>
            <div className="space-y-2 pr-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'rounded-lg border p-3 transition-colors',
                    entry.status === 'error' && 'border-destructive/30 bg-destructive/5',
                    entry.status === 'partial' && 'border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20',
                    entry.status === 'success' && 'bg-muted/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusIcon(entry.status)}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {getTypeIcon(entry.type)}
                        <span>{getTypeName(entry.type)}</span>
                        <span className="text-muted-foreground/50">|</span>
                        <span>{entry.mode === 'auto' ? 'Auto' : 'Manuel'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(entry.status)}
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
                    <div className="mt-3 pt-3 border-t text-xs space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2 rounded bg-muted">
                          <p className="font-medium text-green-600">{entry.itemsCreated}</p>
                          <p className="text-muted-foreground">Crees</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted">
                          <p className="font-medium text-blue-600">{entry.itemsUpdated}</p>
                          <p className="text-muted-foreground">Modifies</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted">
                          <p className="font-medium text-yellow-600">{entry.itemsDeleted}</p>
                          <p className="text-muted-foreground">Supprimes</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted">
                          <p className="font-medium text-destructive">{entry.itemsError}</p>
                          <p className="text-muted-foreground">Erreurs</p>
                        </div>
                      </div>

                      {entry.details?.logs && entry.details.logs.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium mb-1">Details:</p>
                          <ScrollArea className="h-[100px]">
                            <div className="space-y-0.5 text-muted-foreground">
                              {entry.details.logs.slice(0, 20).map((log, i) => (
                                <p key={i} className="font-mono">{log}</p>
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
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
