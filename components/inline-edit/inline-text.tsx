'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Check, X, Pencil, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineTextProps {
  value: string
  onSave: (value: string) => Promise<void>
  placeholder?: string
  className?: string
  inputClassName?: string
  editable?: boolean
}

export function InlineText({
  value,
  onSave,
  placeholder = 'Нажмите для редактирования',
  className,
  inputClassName,
  editable = true,
}: InlineTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
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
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value)
  }

  if (!editable) {
    return (
      <span className={cn('text-gray-900', className)}>
        {value || <span className="text-gray-400">{placeholder}</span>}
      </span>
    )
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn('h-8', inputClassName)}
          disabled={saving}
        />
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : (
          <>
            <button
              onClick={handleSave}
              className="p-1 hover:bg-green-50 rounded text-green-600"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-red-50 rounded text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'group flex items-center gap-2 text-left hover:bg-gray-50 px-2 py-1 -mx-2 -my-1 rounded transition-colors',
        className
      )}
    >
      <span className={value ? 'text-gray-900' : 'text-gray-400'}>
        {value || placeholder}
      </span>
      <Pencil className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
