'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CheckSquare, FolderKanban, Users, Loader2, Search } from 'lucide-react'

interface SearchEntity {
  id: string
  type: 'task' | 'project' | 'client'
  name: string
  subtitle?: string
  status?: string
}

interface EntitySearchPopoverProps {
  query: string
  isOpen: boolean
  position: { top: number; left: number }
  onSelect: (entity: SearchEntity) => void
  onClose: () => void
}

const typeConfig = {
  task: {
    icon: CheckSquare,
    label: 'Задача',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  project: {
    icon: FolderKanban,
    label: 'Проект',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  client: {
    icon: Users,
    label: 'Клиент',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
}

export function EntitySearchPopover({
  query,
  isOpen,
  position,
  onSelect,
  onClose,
}: EntitySearchPopoverProps) {
  const [entities, setEntities] = useState<SearchEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch entities based on query
  useEffect(() => {
    if (!isOpen) return

    const fetchEntities = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        params.set('limit', '10')

        const response = await fetch(`/api/search/entities?${params}`)
        if (response.ok) {
          const data = await response.json()
          setEntities(data.results)
          setSelectedIndex(0)
        }
      } catch (error) {
        console.error('Failed to search entities:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchEntities, 150)
    return () => clearTimeout(debounce)
  }, [query, isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, entities.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (entities[selectedIndex]) {
            onSelect(entities[selectedIndex])
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
  }, [isOpen, entities, selectedIndex, onSelect, onClose])

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

  // Ensure popup doesn't go off-screen
  const adjustedTop = Math.max(10, position.top)
  const adjustedLeft = Math.min(position.left, window.innerWidth - 320)

  return (
    <div
      ref={containerRef}
      className="fixed z-[100] bg-popover border rounded-lg shadow-lg min-w-[300px] max-h-[350px] overflow-y-auto"
      style={{ top: adjustedTop, left: adjustedLeft }}
    >
      <div className="p-2">
        <div className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-1">
          <Search className="h-3 w-3" />
          Задачи, проекты, клиенты
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : entities.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2 py-3 text-center">
            {query ? 'Ничего не найдено' : 'Введите для поиска'}
          </div>
        ) : (
          <div className="space-y-0.5">
            {entities.map((entity, index) => {
              const config = typeConfig[entity.type]
              const Icon = config.icon

              return (
                <button
                  key={`${entity.type}-${entity.id}`}
                  onClick={() => onSelect(entity)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center h-7 w-7 rounded',
                      config.bgColor
                    )}
                  >
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {entity.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <span>{config.label}</span>
                      {entity.subtitle && (
                        <>
                          <span>•</span>
                          <span>{entity.subtitle}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {entity.status && (
                    <span className="text-xs text-muted-foreground">
                      {entity.status}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
