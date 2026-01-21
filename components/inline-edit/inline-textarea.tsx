'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Check, X, Pencil, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineTextareaProps {
  value: string
  onSave: (value: string) => Promise<void>
  placeholder?: string
  className?: string
  textareaClassName?: string
  editable?: boolean
  rows?: number
}

export function InlineTextarea({
  value,
  onSave,
  placeholder = 'Нажмите для редактирования',
  className,
  textareaClassName,
  editable = true,
  rows = 3,
}: InlineTextareaProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      )
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save:', error)
      setEditValue(value)
    } finally {
      setSaving(false)
    }
  }, [editValue, value, onSave])

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
    // Ctrl+Enter или Cmd+Enter для сохранения
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value)
  }

  if (!editable) {
    return (
      <div className={cn('text-gray-900 whitespace-pre-wrap', className)}>
        {value || <span className="text-gray-400">{placeholder}</span>}
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn('min-h-[80px] resize-y', textareaClassName)}
          disabled={saving}
          rows={rows}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Ctrl+Enter для сохранения, Esc для отмены
          </span>
          <div className="flex items-center gap-2">
            {saving ? (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Сохранение...
              </span>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-600 rounded transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Сохранить
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 rounded transition-colors"
                >
                  <X className="h-3 w-3" />
                  Отмена
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'group w-full text-left hover:bg-gray-50 p-2 -m-2 rounded transition-colors min-h-[60px]',
        className
      )}
    >
      <div className="flex justify-between items-start">
        <span
          className={cn(
            'whitespace-pre-wrap flex-1',
            value ? 'text-gray-900' : 'text-gray-400'
          )}
        >
          {value || placeholder}
        </span>
        <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
      </div>
    </button>
  )
}
