'use client'

import { useState, useEffect } from 'react'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { ChatSidebar } from './chat-sidebar'
import { EntityPreviewModal } from './entity-preview-modal'
import { useChat, ChatMessage } from '@/lib/hooks/use-chat'
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ChatPageProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function ChatPage({ user }: ChatPageProps) {
  const {
    currentChannel,
    messages,
    members,
    loading,
    sendingMessage,
    error,
    hasMore,
    sendMessage,
    loadMore,
    markAsRead,
  } = useChat()

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [previewEntity, setPreviewEntity] = useState<{
    type: 'task' | 'project' | 'client' | null
    id: string | null
  }>({ type: null, id: null })

  // Mark as read when viewing channel
  useEffect(() => {
    if (currentChannel && messages.length > 0) {
      markAsRead()
    }
  }, [currentChannel, messages.length, markAsRead])

  const handleReply = (message: ChatMessage) => {
    setReplyTo(message)
  }

  const handleCancelReply = () => {
    setReplyTo(null)
  }

  const handleSend = async (
    content: string,
    mentions: any[],
    entityLinks: any[],
    replyToId?: string
  ) => {
    const result = await sendMessage(content, mentions, entityLinks, replyToId)
    if (result) {
      setReplyTo(null)
    }
    return result
  }

  const handleEntityClick = (type: 'task' | 'project' | 'client', id: string) => {
    setPreviewEntity({ type, id })
  }

  const handleUserClick = (userId: string) => {
    // Could open user profile modal in the future
    console.log('User clicked:', userId)
  }

  const closePreview = () => {
    setPreviewEntity({ type: null, id: null })
  }

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-180px)]">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="font-semibold">
              #{currentChannel?.name || 'Чат'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {currentChannel?.description || 'Общий чат команды'}
            </p>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Messages */}
        <MessageList
          messages={messages}
          currentUserId={user.id}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onReply={handleReply}
          onEntityClick={handleEntityClick}
          onUserClick={handleUserClick}
        />

        {/* Input */}
        <MessageInput
          replyTo={replyTo}
          onCancelReply={handleCancelReply}
          onSend={handleSend}
          sending={sendingMessage}
        />
      </div>

      {/* Sidebar with members - hidden on mobile */}
      <div className="hidden md:block">
        <ChatSidebar
          members={members}
          currentUserId={user.id}
        />
      </div>

      {/* Entity preview modal */}
      <EntityPreviewModal
        type={previewEntity.type}
        id={previewEntity.id}
        isOpen={!!previewEntity.type && !!previewEntity.id}
        onClose={closePreview}
      />
    </div>
  )
}
