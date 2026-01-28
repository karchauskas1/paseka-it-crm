'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CheckCheck, Bell } from 'lucide-react'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  entityType: string | null
  entityId: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationsClient({ user, workspace, initialNotifications }: any) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER'

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        )
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        toast.success('Все уведомления отмечены прочитанными')
      }
    } catch (error) {
      toast.error('Ошибка при отметке уведомлений')
    }
  }

  const getNotificationLink = (notification: Notification): string => {
    if (!notification.entityType || !notification.entityId) return '#'

    switch (notification.entityType) {
      case 'project':
        return `/projects/${notification.entityId}`
      case 'task':
        return `/tasks/${notification.entityId}`
      case 'client':
        return `/clients/${notification.entityId}`
      default:
        return '#'
    }
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/notifications" userRole={user.role}>
      <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Уведомления</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все уведомления прочитаны'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                className="gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Отметить все прочитанными
              </Button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-6">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              Все ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => setFilter('unread')}
              size="sm"
            >
              Непрочитанные ({unreadCount})
            </Button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="bg-card rounded-lg shadow">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {filter === 'unread' ? 'Нет непрочитанных уведомлений' : 'Нет уведомлений'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationLink(notification)}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                  className={`block px-6 py-4 hover:bg-muted transition-colors ${
                    notification.isRead ? 'bg-card' : 'bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${notification.isRead ? 'text-foreground' : 'text-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
    </AppLayout>
  )
}
