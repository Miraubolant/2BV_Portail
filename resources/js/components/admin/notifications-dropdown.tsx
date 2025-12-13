import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Bell, FileText, Calendar, Check, CheckCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { router } from '@inertiajs/react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Notification {
  id: string
  type: string
  titre: string
  message: string | null
  lien: string | null
  lu: boolean
  createdAt: string
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications/unread-count', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/notifications?limit=10', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      const response = await fetch(`/api/admin/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/admin/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        const notification = notifications.find((n) => n.id === id)
        if (notification && !notification.lu) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.lu) {
      markAsRead(notification.id)
    }
    if (notification.lien) {
      setIsOpen(false)
      router.visit(notification.lien)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_upload':
        return FileText
      case 'demande_rdv':
        return Calendar
      default:
        return Bell
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Tout marquer comme lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Chargement...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type)
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex cursor-pointer gap-3 p-3',
                    !notification.lu && 'bg-accent/50'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      notification.type === 'document_upload'
                        ? 'bg-blue-100 text-blue-600'
                        : notification.type === 'demande_rdv'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm',
                          !notification.lu && 'font-medium'
                        )}
                      >
                        {notification.titre}
                      </p>
                      <div className="flex shrink-0 items-center gap-1">
                        {!notification.lu && (
                          <button
                            onClick={(e) => markAsRead(notification.id, e)}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Marquer comme lu"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteNotification(notification.id, e)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </DropdownMenuItem>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
