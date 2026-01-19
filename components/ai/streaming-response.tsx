'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreamingResponseProps {
  endpoint: string
  payload: any
  onComplete?: (text: string) => void
  onError?: (error: string) => void
  className?: string
  autoStart?: boolean
}

export function StreamingResponse({
  endpoint,
  payload,
  onComplete,
  onError,
  className,
  autoStart = true,
}: StreamingResponseProps) {
  const [text, setText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (autoStart) {
      startStreaming()
    }

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const startStreaming = async () => {
    setIsStreaming(true)
    setError(null)
    setText('')

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)

            if (data === '[DONE]') {
              setIsStreaming(false)
              onComplete?.(fullText)
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullText += parsed.text
                setText(fullText)
              }
              if (parsed.error) {
                throw new Error(parsed.error)
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      setIsStreaming(false)
      onComplete?.(fullText)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
      const errorMsg = err.message || 'Ошибка потоковой передачи'
      setError(errorMsg)
      setIsStreaming(false)
      onError?.(errorMsg)
    }
  }

  const stop = () => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }

  if (error) {
    return (
      <div className={cn('p-4 bg-red-50 rounded-lg border border-red-200', className)}>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      {isStreaming && text.length === 0 && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Генерация...</span>
        </div>
      )}

      {text && (
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap">{text}</div>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
          )}
        </div>
      )}
    </div>
  )
}
