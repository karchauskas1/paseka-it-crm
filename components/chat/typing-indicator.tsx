'use client'

import { cn } from '@/lib/utils'
import type { TypingUser } from '@/lib/hooks/use-chat'

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
  className?: string
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} печатает`
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].name} и ${typingUsers[1].name} печатают`
    }
    return `${typingUsers[0].name} и ещё ${typingUsers.length - 1} печатают`
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground',
        className
      )}
    >
      <div className="flex gap-1">
        <span className="animate-bounce [animation-delay:-0.3s]">•</span>
        <span className="animate-bounce [animation-delay:-0.15s]">•</span>
        <span className="animate-bounce">•</span>
      </div>
      <span>{getTypingText()}</span>
    </div>
  )
}
