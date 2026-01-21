'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageItem } from './message-item'
import type { ChatMessage } from '@/lib/hooks/use-chat'

interface MessageListProps {
  messages: ChatMessage[]
  currentUserId: string
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onReply: (message: ChatMessage) => void
  onEntityClick: (type: 'task' | 'project' | 'client', id: string) => void
  onUserClick: (userId: string) => void
}

export function MessageList({
  messages,
  currentUserId,
  loading,
  hasMore,
  onLoadMore,
  onReply,
  onEntityClick,
  onUserClick,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const prevMessagesLengthRef = useRef(messages.length)

  // Check if scrolled to bottom
  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    return scrollHeight - scrollTop - clientHeight < 100
  }, [])

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    })
  }, [])

  // Handle scroll
  const handleScroll = useCallback(() => {
    isAtBottomRef.current = checkIfAtBottom()
  }, [checkIfAtBottom])

  // Auto-scroll when new messages arrive (if already at bottom)
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      // New messages added
      if (isAtBottomRef.current) {
        scrollToBottom()
      }
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages.length, scrollToBottom])

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(false)
    }
  }, [loading, scrollToBottom])

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, ChatMessage[]>)

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Нет сообщений. Начните общение!</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Загрузка...
              </>
            ) : (
              'Загрузить ещё'
            )}
          </Button>
        </div>
      )}

      {/* Messages grouped by date */}
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date}>
          {/* Date separator */}
          <div className="flex items-center gap-4 px-4 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              {date}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Messages for this date */}
          {dateMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwn={message.authorId === currentUserId}
              onReply={onReply}
              onEntityClick={onEntityClick}
              onUserClick={onUserClick}
            />
          ))}
        </div>
      ))}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  )
}
