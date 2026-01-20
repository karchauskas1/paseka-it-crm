'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

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

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  // Fetch unread count for polling
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/count')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count)
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications()

    // Poll every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    if (isMobile) {
      setIsMobileSheetOpen(true)
      fetchNotifications()
    } else {
      setIsOpen(!isOpen)
      if (!isOpen) {
        fetchNotifications()
      }
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      })
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setLoading(false)
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

  const getNotificationIcon = (type: string): string => {
    const icons: Record<string, string> = {
      TASK_ASSIGNED: 'user-plus',
      TASK_DUE_SOON: 'clock',
      TASK_COMPLETED: 'check-circle',
      PROJECT_STATUS_CHANGED: 'refresh-cw',
      COMMENT_ADDED: 'message-circle',
      MENTION: 'at-sign',
      DEADLINE_APPROACHING: 'alert-triangle',
    }
    return icons[type] || 'bell'
  }

  // Notification content for both mobile and desktop
  const NotificationContent = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            Нет уведомлений
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={markAsRead}
              link={getNotificationLink(notification)}
              onClose={onClose}
            />
          ))
        )}
      </div>
      <div className="px-4 py-3 border-t bg-muted/50 shrink-0">
        <Link
          href="/notifications"
          className="text-sm text-primary hover:text-primary/80 font-medium"
          onClick={onClose}
        >
          Все уведомления →
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Sheet */}
      <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="relative"
            onClick={handleOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>Уведомления</SheetTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-xs text-primary"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Прочитать все
                </Button>
              )}
            </div>
          </SheetHeader>
          <NotificationContent onClose={() => setIsMobileSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Dropdown */}
      <div className="relative hidden md:block" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={handleOpen}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-lg border z-50 flex flex-col max-h-[70vh]">
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-foreground">Уведомления</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Прочитать все
                </Button>
              )}
            </div>
            <NotificationContent onClose={() => setIsOpen(false)} />
          </div>
        )}
      </div>
    </>
  )
}

function NotificationItem({
  notification,
  onRead,
  link,
  onClose,
}: {
  notification: Notification
  onRead: (id: string) => void
  link: string
  onClose?: () => void
}) {
  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id)
    }
    onClose?.()
  }

  return (
    <Link
      href={link}
      onClick={handleClick}
      className={`block px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors border-b last:border-b-0 touch-manipulation ${
        notification.isRead ? 'bg-card' : 'bg-primary/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${notification.isRead ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: ru,
            })}
          </p>
        </div>
        {!notification.isRead && (
          <div className="flex-shrink-0">
            <div className="h-2 w-2 bg-primary rounded-full" />
          </div>
        )}
      </div>
    </Link>
  )
}
