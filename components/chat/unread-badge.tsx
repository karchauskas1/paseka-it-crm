'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface UnreadBadgeProps {
  className?: string
}

export function UnreadBadge({ className }: UnreadBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await fetch('/api/chat/unread')
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.totalUnread)
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error)
      }
    }

    // Fetch immediately
    fetchUnread()

    // Poll every 30 seconds
    const interval = setInterval(fetchUnread, 30000)

    return () => clearInterval(interval)
  }, [])

  if (unreadCount === 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full',
        className
      )}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )
}
