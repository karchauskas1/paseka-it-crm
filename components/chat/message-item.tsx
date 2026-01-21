'use client'

import { useState, ReactNode } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Reply, User, FolderKanban, Users, CheckSquare } from 'lucide-react'
import type { ChatMessage } from '@/lib/hooks/use-chat'

interface MessageItemProps {
  message: ChatMessage
  isOwn: boolean
  onReply: (message: ChatMessage) => void
  onEntityClick: (type: 'task' | 'project' | 'client', id: string) => void
  onUserClick: (userId: string) => void
}

export function MessageItem({
  message,
  isOwn,
  onReply,
  onEntityClick,
  onUserClick,
}: MessageItemProps) {
  const [showActions, setShowActions] = useState(false)

  // Get author initials
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    }
    return email.substring(0, 2).toUpperCase()
  }

  // Parse content and render mentions/entity links
  const renderContent = () => {
    let content = message.content
    const elements: ReactNode[] = []
    let lastIndex = 0

    // Regex for @[Name](user:id) and /[Name](type:id)
    const mentionRegex = /@\[([^\]]+)\]\(user:([^)]+)\)/g
    const entityRegex = /\/\[([^\]]+)\]\((task|project|client):([^)]+)\)/g

    // Combine all matches
    const allMatches: Array<{
      index: number
      length: number
      element: ReactNode
    }> = []

    // Find mentions
    let match
    while ((match = mentionRegex.exec(content)) !== null) {
      const userId = match[2]
      const userName = match[1]
      const matchIndex = match.index
      const matchLength = match[0].length

      allMatches.push({
        index: matchIndex,
        length: matchLength,
        element: (
          <button
            key={`mention-${userId}-${matchIndex}`}
            onClick={() => onUserClick(userId)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            <User className="h-3 w-3" />
            {userName}
          </button>
        ),
      })
    }

    // Find entity links
    while ((match = entityRegex.exec(content)) !== null) {
      const type = match[2] as 'task' | 'project' | 'client'
      const entityId = match[3]
      const entityName = match[1]
      const matchIndex = match.index
      const matchLength = match[0].length
      const Icon = type === 'task' ? CheckSquare : type === 'project' ? FolderKanban : Users

      allMatches.push({
        index: matchIndex,
        length: matchLength,
        element: (
          <button
            key={`entity-${entityId}-${matchIndex}`}
            onClick={() => onEntityClick(type, entityId)}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-sm font-medium transition-colors',
              type === 'task' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50',
              type === 'project' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50',
              type === 'client' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50'
            )}
          >
            <Icon className="h-3 w-3" />
            {entityName}
          </button>
        ),
      })
    }

    // Sort matches by index
    allMatches.sort((a, b) => a.index - b.index)

    // Build elements array
    for (const matchItem of allMatches) {
      if (matchItem.index > lastIndex) {
        elements.push(content.substring(lastIndex, matchItem.index))
      }
      elements.push(matchItem.element)
      lastIndex = matchItem.index + matchItem.length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      elements.push(content.substring(lastIndex))
    }

    return elements.length > 0 ? elements : content
  }

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-2 hover:bg-muted/50 transition-colors',
        isOwn && 'bg-muted/30'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarFallback className="text-xs">
          {getInitials(message.author.name, message.author.email)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {message.author.name || message.author.email}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), 'HH:mm', { locale: ru })}
          </span>
        </div>

        {/* Reply quote */}
        {message.replyTo && (
          <div className="mt-1 pl-3 border-l-2 border-muted-foreground/30 text-sm text-muted-foreground">
            <span className="font-medium">
              {message.replyTo.author.name || 'Пользователь'}:
            </span>{' '}
            <span className="line-clamp-1">{message.replyTo.content}</span>
          </div>
        )}

        {/* Message content */}
        <div className="mt-1 text-sm whitespace-pre-wrap break-words">
          {renderContent()}
        </div>
      </div>

      {/* Actions */}
      <div
        className={cn(
          'flex items-start gap-1 transition-opacity',
          showActions ? 'opacity-100' : 'opacity-0'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onReply(message)}
          title="Ответить"
        >
          <Reply className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
