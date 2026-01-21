'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ChatAuthor {
  id: string
  name: string | null
  email: string
  image: string | null
}

export interface ChatReplyTo {
  id: string
  content: string
  author: {
    id: string
    name: string | null
  }
}

export interface ChatMention {
  type: 'user'
  id: string
  name: string
}

export interface ChatEntityLink {
  type: 'task' | 'project' | 'client'
  id: string
  name: string
}

export interface ChatMessage {
  id: string
  channelId: string
  content: string
  mentions: ChatMention[]
  entityLinks: ChatEntityLink[]
  replyToId: string | null
  authorId: string
  createdAt: string
  author: ChatAuthor
  replyTo: ChatReplyTo | null
}

export interface ChatChannel {
  id: string
  workspaceId: string
  name: string
  type: 'GENERAL' | 'PROJECT' | 'PRIVATE'
  description: string | null
  createdAt: string
  unreadCount: number
}

export interface WorkspaceMember {
  userId: string
  name: string | null
  email: string
  image: string | null
  role: string
  isOnline: boolean
  lastSeenAt: string | null
}

export function useChat() {
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [currentChannel, setCurrentChannel] = useState<ChatChannel | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/channels')
      if (!response.ok) throw new Error('Failed to fetch channels')
      const data = await response.json()
      setChannels(data.channels)

      // Auto-select first channel (general)
      if (data.channels.length > 0 && !currentChannel) {
        setCurrentChannel(data.channels[0])
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err)
      setError('Не удалось загрузить каналы')
    }
  }, [currentChannel])

  // Fetch messages for current channel
  const fetchMessages = useCallback(async (cursor?: string) => {
    if (!currentChannel) return

    try {
      setLoading(true)
      const url = new URL(`/api/chat/channels/${currentChannel.id}/messages`, window.location.origin)
      if (cursor) url.searchParams.set('cursor', cursor)

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Failed to fetch messages')

      const data = await response.json()

      if (cursor) {
        // Loading more (older messages) - prepend to beginning
        setMessages(prev => [...data.messages, ...prev])
      } else {
        // Initial load
        setMessages(data.messages)
      }

      setHasMore(data.hasMore)
      setNextCursor(data.nextCursor)
    } catch (err) {
      console.error('Failed to fetch messages:', err)
      setError('Не удалось загрузить сообщения')
    } finally {
      setLoading(false)
    }
  }, [currentChannel])

  // Load more messages (pagination)
  const loadMore = useCallback(() => {
    if (hasMore && nextCursor && !loading) {
      fetchMessages(nextCursor)
    }
  }, [hasMore, nextCursor, loading, fetchMessages])

  // Fetch workspace members
  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/presence/workspace')
      if (!response.ok) throw new Error('Failed to fetch members')
      const data = await response.json()
      setMembers(data.members)
    } catch (err) {
      console.error('Failed to fetch members:', err)
    }
  }, [])

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    mentions: ChatMention[] = [],
    entityLinks: ChatEntityLink[] = [],
    replyToId?: string
  ) => {
    if (!currentChannel || !content.trim()) return

    try {
      setSendingMessage(true)
      const response = await fetch(`/api/chat/channels/${currentChannel.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          mentions,
          entityLinks,
          replyToId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      const data = await response.json()

      // Add message to list (it will also come via SSE, but adding immediately for responsiveness)
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === data.message.id)) return prev
        return [...prev, data.message]
      })

      return data.message
    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Не удалось отправить сообщение')
      throw err
    } finally {
      setSendingMessage(false)
    }
  }, [currentChannel])

  // Mark channel as read
  const markAsRead = useCallback(async () => {
    if (!currentChannel) return

    try {
      await fetch(`/api/chat/channels/${currentChannel.id}/read`, {
        method: 'POST',
      })

      // Update channel unread count
      setChannels(prev =>
        prev.map(ch =>
          ch.id === currentChannel.id
            ? { ...ch, unreadCount: 0 }
            : ch
        )
      )
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }, [currentChannel])

  // Send heartbeat for presence
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch('/api/presence/heartbeat', { method: 'POST' })
    } catch (err) {
      console.error('Heartbeat failed:', err)
    }
  }, [])

  // Setup SSE connection for real-time updates
  useEffect(() => {
    if (!currentChannel) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/chat/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('SSE connected')
    }

    eventSource.addEventListener('new_message', (event) => {
      const message = JSON.parse(event.data) as ChatMessage

      // Only add if it's for current channel
      if (message.channelId === currentChannel.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) return prev
          return [...prev, message]
        })
      }

      // Update unread count for other channels
      if (message.channelId !== currentChannel.id) {
        setChannels(prev =>
          prev.map(ch =>
            ch.id === message.channelId
              ? { ...ch, unreadCount: ch.unreadCount + 1 }
              : ch
          )
        )
      }
    })

    eventSource.addEventListener('presence', (event) => {
      const data = JSON.parse(event.data)
      // Update online status in members list
      if (data.online) {
        setMembers(prev =>
          prev.map(member => {
            const onlineUser = data.online.find((u: any) => u.userId === member.userId)
            if (onlineUser) {
              return { ...member, isOnline: true, lastSeenAt: onlineUser.lastSeenAt }
            }
            return member
          })
        )
      }
    })

    eventSource.onerror = (err) => {
      console.error('SSE error:', err)
      // Will auto-reconnect
    }

    return () => {
      eventSource.close()
    }
  }, [currentChannel])

  // Setup heartbeat interval
  useEffect(() => {
    // Send initial heartbeat
    sendHeartbeat()

    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000)

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [sendHeartbeat])

  // Initial data fetch
  useEffect(() => {
    fetchChannels()
    fetchMembers()
  }, [fetchChannels, fetchMembers])

  // Fetch messages when channel changes
  useEffect(() => {
    if (currentChannel) {
      fetchMessages()
    }
  }, [currentChannel, fetchMessages])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timeout)
    }
  }, [error])

  return {
    channels,
    currentChannel,
    setCurrentChannel,
    messages,
    members,
    loading,
    sendingMessage,
    error,
    hasMore,
    sendMessage,
    loadMore,
    markAsRead,
    refreshChannels: fetchChannels,
    refreshMembers: fetchMembers,
  }
}
