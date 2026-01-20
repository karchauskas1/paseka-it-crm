'use client'

import { useState, useRef, useEffect } from 'react'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'
import {
  Send,
  Loader2,
  Bot,
  User,
  Plus,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  modelInfo?: { name: string; provider: string }
  timestamp: Date
}

interface ChatSession {
  id: string
  messages: Message[]
  model: string
  title: string
}

interface AIChatClientProps {
  user: any
  workspace: any
}

const AI_MODELS = {
  'openai/gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'Самая мощная модель GPT-4',
    color: 'bg-green-500',
  },
  'openai/gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Быстрая и экономичная модель',
    color: 'bg-green-400',
  },
  'anthropic/claude-3-opus': {
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Самая мощная модель Claude',
    color: 'bg-orange-500',
  },
  'anthropic/claude-3-sonnet': {
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Баланс скорости и качества',
    color: 'bg-orange-400',
  },
  'anthropic/claude-3-haiku': {
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Быстрая и лёгкая модель',
    color: 'bg-orange-300',
  },
  'google/gemini-pro': {
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Мощная модель от Google',
    color: 'bg-blue-500',
  },
  'meta-llama/llama-3-70b-instruct': {
    name: 'Llama 3 70B',
    provider: 'Meta',
    description: 'Открытая модель от Meta',
    color: 'bg-purple-500',
  },
  'mistralai/mixtral-8x7b-instruct': {
    name: 'Mixtral 8x7B',
    provider: 'Mistral',
    description: 'MoE модель от Mistral',
    color: 'bg-indigo-500',
  },
}

export default function AIChatClient({ user, workspace }: AIChatClientProps) {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: '1',
      messages: [],
      model: 'openai/gpt-4-turbo',
      title: 'Новый чат',
    },
  ])
  const [activeSessionId, setActiveSessionId] = useState('1')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeSession = sessions.find((s) => s.id === activeSessionId)!

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeSession?.messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    // Update session with user message
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [...s.messages, userMessage],
              title:
                s.messages.length === 0
                  ? input.trim().slice(0, 30) + (input.trim().length > 30 ? '...' : '')
                  : s.title,
            }
          : s
      )
    )

    setInput('')
    setIsLoading(true)

    try {
      const messagesToSend = [
        ...activeSession.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: input.trim() },
      ]

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          model: activeSession.model,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка отправки сообщения')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        model: data.model,
        modelInfo: data.modelInfo,
        timestamp: new Date(),
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, messages: [...s.messages, assistantMessage] }
            : s
        )
      )
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const createNewSession = () => {
    const newId = Date.now().toString()
    setSessions((prev) => [
      ...prev,
      {
        id: newId,
        messages: [],
        model: 'openai/gpt-4-turbo',
        title: 'Новый чат',
      },
    ])
    setActiveSessionId(newId)
  }

  const deleteSession = (sessionId: string) => {
    if (sessions.length === 1) {
      toast({
        title: 'Нельзя удалить',
        description: 'Должен остаться хотя бы один чат',
        variant: 'destructive',
      })
      return
    }

    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions.find((s) => s.id !== sessionId)!.id)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const changeModel = (model: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, model } : s))
    )
  }

  const modelInfo = AI_MODELS[activeSession.model as keyof typeof AI_MODELS]

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/ai-chat" userRole={user.role}>
      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar with sessions */}
        <div className="w-64 bg-gray-50 border-r p-4 flex flex-col">
          <Button onClick={createNewSession} className="w-full mb-4">
            <Plus className="h-4 w-4 mr-2" />
            Новый чат
          </Button>

          <div className="flex-1 overflow-y-auto space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'p-3 rounded-lg cursor-pointer group flex items-center justify-between',
                  session.id === activeSessionId
                    ? 'bg-blue-100 border border-blue-200'
                    : 'hover:bg-gray-100'
                )}
                onClick={() => setActiveSessionId(session.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <MessageSquare className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  <span className="text-sm truncate">{session.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSession(session.id)
                  }}
                >
                  <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {/* Header with model selector */}
          <div className="border-b p-4 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <h1 className="text-lg font-semibold">AI Чат</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Модель:</span>
                <Select value={activeSession.model} onValueChange={changeModel}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AI_MODELS).map(([id, model]) => (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', model.color)} />
                          <span>{model.name}</span>
                          <span className="text-xs text-gray-400">({model.provider})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="text-xs">
                {modelInfo?.description}
              </Badge>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeSession.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Bot className="h-16 w-16 mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold mb-2">Начните разговор</h2>
                <p className="text-sm text-center max-w-md">
                  Задайте вопрос AI или выберите другую модель для сравнения ответов.
                  Вы можете создать несколько чатов с разными моделями.
                </p>
              </div>
            ) : (
              activeSession.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        AI_MODELS[message.model as keyof typeof AI_MODELS]?.color ||
                          'bg-gray-500'
                      )}
                    >
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg p-4 group relative',
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    )}
                  >
                    {message.role === 'assistant' && message.modelInfo && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                        <Badge variant="outline" className="text-xs">
                          {message.modelInfo.name}
                        </Badge>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{message.content}</div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0',
                        message.role === 'user' ? 'text-white/70 hover:text-white' : ''
                      )}
                      onClick={() => copyToClipboard(message.content, message.id)}
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    modelInfo?.color || 'bg-gray-500'
                  )}
                >
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">
                      {modelInfo?.name} думает...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t p-4 bg-white">
            <div className="flex gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Введите сообщение... (Enter для отправки, Shift+Enter для новой строки)"
                className="flex-1 min-h-[60px] max-h-[200px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="self-end"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
