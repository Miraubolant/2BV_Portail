import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ADMIN_TIMELINE_API } from '@/lib/constants'
import {
  Activity,
  FolderPlus,
  RefreshCw,
  Edit,
  Upload,
  Trash2,
  CalendarPlus,
  Calendar,
  CalendarX,
  StickyNote,
  Edit3,
  LoaderCircle,
  ChevronDown,
  User,
  Clock,
  CheckSquare,
  CheckCircle,
  RotateCcw,
} from 'lucide-react'

interface TimelineEntry {
  id: string
  action: string
  createdAt: string
  user: {
    id: string | null
    type: string
    nom: string
    prenom: string
  } | null
  metadata: Record<string, any>
  icon: string
  color: string
  title: string
  description: string
}

interface DossierTimelineProps {
  dossierId: string
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'folder-plus': FolderPlus,
  'refresh-cw': RefreshCw,
  'edit': Edit,
  'upload': Upload,
  'trash-2': Trash2,
  'calendar-plus': CalendarPlus,
  'calendar': Calendar,
  'calendar-x': CalendarX,
  'sticky-note': StickyNote,
  'edit-3': Edit3,
  'activity': Activity,
  'check-square': CheckSquare,
  'check-circle': CheckCircle,
  'rotate-ccw': RotateCcw,
}

const colorMap: Record<string, string> = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-500',
}

const filterOptions = [
  { value: 'all', label: 'Toutes les activites' },
  { value: 'dossier', label: 'Dossier' },
  { value: 'document', label: 'Documents' },
  { value: 'evenement', label: 'Evenements' },
  { value: 'note', label: 'Notes' },
  { value: 'task', label: 'Taches' },
]

export function DossierTimeline({ dossierId }: DossierTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState('all')
  const [offset, setOffset] = useState(0)
  const limit = 20

  const fetchTimeline = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
      })
      if (filter && filter !== 'all') {
        params.append('action', filter)
      }

      const response = await fetch(`${ADMIN_TIMELINE_API(dossierId)}?${params}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const result = await response.json()
        if (reset) {
          setEntries(result.data)
          setOffset(limit)
        } else {
          setEntries((prev) => [...prev, ...result.data])
          setOffset(currentOffset + limit)
        }
        setHasMore(result.meta.hasMore)
      }
    } catch (error) {
      console.error('Error fetching timeline:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [dossierId, filter, offset])

  useEffect(() => {
    fetchTimeline(true)
  }, [dossierId, filter])

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'A l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`

    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(date)
  }

  const formatFullDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(dateStr))
  }

  // Group entries by date
  const groupedEntries = entries.reduce((groups, entry) => {
    const date = new Date(entry.createdAt).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(entry)
    return groups
  }, {} as Record<string, TimelineEntry[]>)

  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui'
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier'
    }
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    }).format(date)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Historique ({entries.length})
          </CardTitle>
          <Select value={filter} onValueChange={(value) => setFilter(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Aucune activite enregistree</p>
            <p className="text-sm mt-1">Les actions sur ce dossier apparaitront ici</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEntries).map(([dateStr, dayEntries]) => (
              <div key={dateStr}>
                <div className="sticky top-0 bg-background py-2 z-10">
                  <Badge variant="outline" className="text-xs font-normal">
                    {formatGroupDate(dateStr)}
                  </Badge>
                </div>
                <div className="relative ml-4 border-l-2 border-muted pl-6 space-y-6">
                  {dayEntries.map((entry) => {
                    const IconComponent = iconMap[entry.icon] || Activity
                    const bgColor = colorMap[entry.color] || colorMap.gray

                    return (
                      <div key={entry.id} className="relative group">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-[31px] p-1.5 rounded-full ${bgColor} text-white`}
                        >
                          <IconComponent className="h-3 w-3" />
                        </div>

                        {/* Content */}
                        <div className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{entry.title}</p>
                              {entry.description && (
                                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                  {entry.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                              <Clock className="h-3 w-3" />
                              <span title={formatFullDate(entry.createdAt)}>
                                {formatRelativeTime(entry.createdAt)}
                              </span>
                            </div>
                          </div>

                          {entry.user && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>
                                {entry.user.prenom} {entry.user.nom}
                                {entry.user.type === 'client' && (
                                  <Badge variant="secondary" className="ml-1.5 text-[10px] py-0">
                                    Client
                                  </Badge>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchTimeline(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="mr-2 h-4 w-4" />
                  )}
                  Charger plus
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
