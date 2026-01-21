'use client'

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { X, Send, Loader2 } from 'lucide-react'
import { MentionPopover } from './mention-popover'
import { EntitySearchPopover } from './entity-search-popover'
import type { ChatMessage, ChatMention, ChatEntityLink } from '@/lib/hooks/use-chat'

interface MessageInputProps {
  replyTo: ChatMessage | null
  onCancelReply: () => void
  onSend: (
    content: string,
    mentions: ChatMention[],
    entityLinks: ChatEntityLink[],
    replyToId?: string
  ) => Promise<any>
  disabled?: boolean
  sending?: boolean
}

export function MessageInput({
  replyTo,
  onCancelReply,
  onSend,
  disabled,
  sending,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [mentionQuery, setMentionQuery] = useState('')
  const [entityQuery, setEntityQuery] = useState('')
  const [showMentionPopover, setShowMentionPopover] = useState(false)
  const [showEntityPopover, setShowEntityPopover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })
  const [mentions, setMentions] = useState<ChatMention[]>([])
  const [entityLinks, setEntityLinks] = useState<ChatEntityLink[]>([])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cursorPositionRef = useRef(0)

  // Calculate popover position based on cursor
  const updatePopoverPosition = useCallback(() => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const rect = textarea.getBoundingClientRect()

    // Approximate position - top of textarea, left edge
    setPopoverPosition({
      top: rect.top - 10,
      left: rect.left,
    })
  }, [])

  // Handle text change and detect @ or /
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    cursorPositionRef.current = cursorPos

    setContent(value)

    // Find the word being typed
    const textBeforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/')
    const lastSpaceIndex = Math.max(
      textBeforeCursor.lastIndexOf(' '),
      textBeforeCursor.lastIndexOf('\n')
    )

    // Check for @ mention trigger
    if (lastAtIndex > lastSpaceIndex && lastAtIndex >= 0) {
      const query = textBeforeCursor.slice(lastAtIndex + 1)
      if (!query.includes(' ') && !query.includes('\n')) {
        setMentionQuery(query)
        setShowMentionPopover(true)
        setShowEntityPopover(false)
        updatePopoverPosition()
        return
      }
    }

    // Check for / entity search trigger
    if (lastSlashIndex > lastSpaceIndex && lastSlashIndex >= 0) {
      const query = textBeforeCursor.slice(lastSlashIndex + 1)
      if (!query.includes(' ') && !query.includes('\n')) {
        setEntityQuery(query)
        setShowEntityPopover(true)
        setShowMentionPopover(false)
        updatePopoverPosition()
        return
      }
    }

    // Close popovers if no trigger found
    setShowMentionPopover(false)
    setShowEntityPopover(false)
  }

  // Handle mention selection
  const handleMentionSelect = (user: { id: string; name: string | null; email: string }) => {
    const displayName = user.name || user.email
    const mentionText = `@[${displayName}](user:${user.id})`

    // Replace the @query with the mention
    const textBeforeCursor = content.slice(0, cursorPositionRef.current)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    const textAfterCursor = content.slice(cursorPositionRef.current)

    const newContent =
      content.slice(0, lastAtIndex) + mentionText + ' ' + textAfterCursor

    setContent(newContent)
    setMentions((prev) => [...prev, { type: 'user', id: user.id, name: displayName }])
    setShowMentionPopover(false)
    setMentionQuery('')

    // Focus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + mentionText.length + 1
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Handle entity selection
  const handleEntitySelect = (entity: {
    id: string
    type: 'task' | 'project' | 'client'
    name: string
  }) => {
    const entityText = `/[${entity.name}](${entity.type}:${entity.id})`

    // Replace the /query with the entity link
    const textBeforeCursor = content.slice(0, cursorPositionRef.current)
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/')
    const textAfterCursor = content.slice(cursorPositionRef.current)

    const newContent =
      content.slice(0, lastSlashIndex) + entityText + ' ' + textAfterCursor

    setContent(newContent)
    setEntityLinks((prev) => [
      ...prev,
      { type: entity.type, id: entity.id, name: entity.name },
    ])
    setShowEntityPopover(false)
    setEntityQuery('')

    // Focus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastSlashIndex + entityText.length + 1
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Handle send
  const handleSend = async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || disabled || sending) return

    try {
      await onSend(trimmedContent, mentions, entityLinks, replyTo?.id)
      setContent('')
      setMentions([])
      setEntityLinks([])
    } catch (error) {
      // Error handled in parent
    }
  }

  // Handle key down
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey && !showMentionPopover && !showEntityPopover) {
      e.preventDefault()
      handleSend()
    }

    // Close popovers on Escape
    if (e.key === 'Escape') {
      setShowMentionPopover(false)
      setShowEntityPopover(false)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [content])

  return (
    <div className="border-t bg-background">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 pt-2 pb-1 text-sm text-muted-foreground">
          <div className="flex-1 truncate">
            <span className="font-medium">
              Ответ {replyTo.author.name || 'пользователю'}:
            </span>{' '}
            <span className="opacity-75">{replyTo.content.substring(0, 100)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-4">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Введите сообщение... (@для упоминания, /для поиска)"
          className="min-h-[44px] max-h-[200px] resize-none"
          disabled={disabled}
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!content.trim() || disabled || sending}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mention popover */}
      <MentionPopover
        query={mentionQuery}
        isOpen={showMentionPopover}
        position={popoverPosition}
        onSelect={handleMentionSelect}
        onClose={() => setShowMentionPopover(false)}
      />

      {/* Entity search popover */}
      <EntitySearchPopover
        query={entityQuery}
        isOpen={showEntityPopover}
        position={popoverPosition}
        onSelect={handleEntitySelect}
        onClose={() => setShowEntityPopover(false)}
      />
    </div>
  )
}
