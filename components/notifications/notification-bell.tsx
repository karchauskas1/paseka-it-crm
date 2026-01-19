'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    setIsOpen(!isOpen)
    if (!isOpen) {
      fetchNotifications()
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

  return (
    <div className="relative" ref={dropdownRef}>
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
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Уведомления</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Прочитать все
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                Нет уведомлений
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                  link={getNotificationLink(notification)}
                />
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t bg-gray-50">
            <Link
              href="/notifications"
              className="text-xs text-blue-600 hover:text-blue-800"
              onClick={() => setIsOpen(false)}
            >
              Все уведомления
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  onRead,
  link,
}: {
  notification: Notification
  onRead: (id: string) => void
  link: string
}) {
  const handleClick = () => {
    if (!notification.isRead) {
      onRead(notification.id)
    }
  }

  return (
    <Link
      href={link}
      onClick={handleClick}
      className={`block px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
        notification.isRead ? 'bg-white' : 'bg-blue-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${notification.isRead ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {notification.message}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: ru,
            })}
          </p>
        </div>
        {!notification.isRead && (
          <div className="flex-shrink-0">
            <div className="h-2 w-2 bg-blue-500 rounded-full" />
          </div>
        )}
      </div>
    </Link>
  )
}
