'use client'

import { useEffect, useState, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { User, Loader2 } from 'lucide-react'

interface SearchUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  isOnline: boolean
}

interface MentionPopoverProps {
  query: string
  isOpen: boolean
  position: { top: number; left: number }
  onSelect: (user: SearchUser) => void
  onClose: () => void
}

export function MentionPopover({
  query,
  isOpen,
  position,
  onSelect,
  onClose,
}: MentionPopoverProps) {
  const [users, setUsers] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch users based on query
  useEffect(() => {
    if (!isOpen) return

    const fetchUsers = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        params.set('limit', '8')

        const response = await fetch(`/api/search/users?${params}`)
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users)
          setSelectedIndex(0)
        }
      } catch (error) {
        console.error('Failed to search users:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchUsers, 150)
    return () => clearTimeout(debounce)
  }, [query, isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, users.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (users[selectedIndex]) {
            onSelect(users[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, users, selectedIndex, onSelect, onClose])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

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

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-popover border rounded-lg shadow-lg min-w-[250px] max-h-[300px] overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2">
        <div className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-1">
          <User className="h-3 w-3" />
          Участники
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2 py-3 text-center">
            Участники не найдены
          </div>
        ) : (
          <div className="space-y-0.5">
            {users.map((user, index) => (
              <button
                key={user.id}
                onClick={() => onSelect(user)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                <div className="relative">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  {user.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-popover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {user.name || user.email}
                  </div>
                  {user.name && (
                    <div className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
