'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Search,
  Folder,
  Users,
  CheckSquare,
  Plus,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResults {
  projects: Array<{
    id: string
    name: string
    status: string
    client: { name: string } | null
  }>
  clients: Array<{
    id: string
    name: string
    company: string | null
    email: string | null
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
    project: { id: string; name: string } | null
  }>
}

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  href: string
}

const quickActions: QuickAction[] = [
  { id: 'new-project', label: 'Создать проект', icon: <Plus className="h-4 w-4" />, href: '/projects/new' },
  { id: 'new-client', label: 'Создать клиента', icon: <Plus className="h-4 w-4" />, href: '/clients/new' },
  { id: 'new-task', label: 'Создать задачу', icon: <Plus className="h-4 w-4" />, href: '/tasks/new' },
]

const SEARCH_HISTORY_KEY = 'paseka-search-history'
const MAX_HISTORY_ITEMS = 5

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Загрузить историю поиска
  useEffect(() => {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (history) {
      try {
        setSearchHistory(JSON.parse(history))
      } catch {
        // ignore
      }
    }
  }, [])

  // Сохранить в историю
  const saveToHistory = useCallback((q: string) => {
    if (!q.trim()) return
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== q)
      const newHistory = [q, ...filtered].slice(0, MAX_HISTORY_ITEMS)
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
      return newHistory
    })
  }, [])

  // Обработка Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Фокус на инпут при открытии
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery('')
      setResults(null)
      setSelectedIndex(0)
    }
  }, [open])

  // Поиск с debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length < 2) {
      setResults(null)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  // Подсчёт общего количества элементов для навигации
  const getAllItems = useCallback(() => {
    const items: Array<{ type: string; href: string; label: string }> = []

    // Quick actions
    if (!query) {
      quickActions.forEach((action) => {
        items.push({ type: 'action', href: action.href, label: action.label })
      })
      // История
      searchHistory.forEach((h) => {
        items.push({ type: 'history', href: '', label: h })
      })
    } else if (results) {
      results.projects.forEach((p) => {
        items.push({ type: 'project', href: `/projects/${p.id}`, label: p.name })
      })
      results.clients.forEach((c) => {
        items.push({ type: 'client', href: `/clients/${c.id}`, label: c.name })
      })
      results.tasks.forEach((t) => {
        items.push({ type: 'task', href: `/tasks/${t.id}`, label: t.title })
      })
    }

    return items
  }, [query, results, searchHistory])

  // Навигация клавиатурой
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = getAllItems()

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % items.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = items[selectedIndex]
        if (selected) {
          if (selected.type === 'history') {
            setQuery(selected.label)
          } else {
            saveToHistory(query)
            router.push(selected.href)
            setOpen(false)
          }
        }
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    },
    [getAllItems, selectedIndex, query, router, saveToHistory]
  )

  const handleSelect = (href: string) => {
    saveToHistory(query)
    router.push(href)
    setOpen(false)
  }

  const handleHistoryClick = (h: string) => {
    setQuery(h)
  }

  const totalResults =
    (results?.projects.length || 0) +
    (results?.clients.length || 0) +
    (results?.tasks.length || 0)

  let currentIndex = 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-lg">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-gray-500 mr-2" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Поиск проектов, клиентов, задач..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] text-gray-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {/* Пустой запрос - показываем быстрые действия и историю */}
          {!query && (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                Быстрые действия
              </div>
              {quickActions.map((action, i) => (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action.href)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    selectedIndex === i
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-gray-100'
                  )}
                >
                  {action.icon}
                  <span>{action.label}</span>
                  <ArrowRight className="h-3 w-3 ml-auto text-gray-400" />
                </button>
              ))}

              {searchHistory.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 mt-2">
                    Недавний поиск
                  </div>
                  {searchHistory.map((h, i) => (
                    <button
                      key={h}
                      onClick={() => handleHistoryClick(h)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        selectedIndex === quickActions.length + i
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-gray-100'
                      )}
                    >
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{h}</span>
                    </button>
                  ))}
                </>
              )}
            </>
          )}

          {/* Загрузка */}
          {query && loading && (
            <div className="py-8 text-center text-gray-500 text-sm">
              Поиск...
            </div>
          )}

          {/* Нет результатов */}
          {query && !loading && totalResults === 0 && (
            <div className="py-8 text-center text-gray-500 text-sm">
              Ничего не найдено по запросу "{query}"
            </div>
          )}

          {/* Результаты поиска */}
          {query && !loading && results && totalResults > 0 && (
            <>
              {/* Проекты */}
              {results.projects.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                    Проекты
                  </div>
                  {results.projects.map((project) => {
                    const itemIndex = currentIndex++
                    return (
                      <button
                        key={project.id}
                        onClick={() => handleSelect(`/projects/${project.id}`)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                          selectedIndex === itemIndex
                            ? 'bg-blue-50 text-blue-600'
                            : 'hover:bg-gray-100'
                        )}
                      >
                        <Folder className="h-4 w-4 text-blue-500" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{project.name}</div>
                          {project.client && (
                            <div className="text-xs text-gray-500">
                              {project.client.name}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {getStatusLabel(project.status)}
                        </span>
                      </button>
                    )
                  })}
                </>
              )}

              {/* Клиенты */}
              {results.clients.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 mt-2">
                    Клиенты
                  </div>
                  {results.clients.map((client) => {
                    const itemIndex = currentIndex++
                    return (
                      <button
                        key={client.id}
                        onClick={() => handleSelect(`/clients/${client.id}`)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                          selectedIndex === itemIndex
                            ? 'bg-blue-50 text-blue-600'
                            : 'hover:bg-gray-100'
                        )}
                      >
                        <Users className="h-4 w-4 text-green-500" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{client.name}</div>
                          {client.company && (
                            <div className="text-xs text-gray-500">
                              {client.company}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </>
              )}

              {/* Задачи */}
              {results.tasks.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-gray-500 mt-2">
                    Задачи
                  </div>
                  {results.tasks.map((task) => {
                    const itemIndex = currentIndex++
                    return (
                      <button
                        key={task.id}
                        onClick={() => handleSelect(`/tasks/${task.id}`)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                          selectedIndex === itemIndex
                            ? 'bg-blue-50 text-blue-600'
                            : 'hover:bg-gray-100'
                        )}
                      >
                        <CheckSquare className="h-4 w-4 text-orange-500" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{task.title}</div>
                          {task.project && (
                            <div className="text-xs text-gray-500">
                              {task.project.name}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {getTaskStatusLabel(task.status)}
                        </span>
                      </button>
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>

        <div className="border-t px-3 py-2 text-xs text-gray-500 flex items-center gap-4">
          <span>
            <kbd className="rounded border bg-gray-100 px-1">↑</kbd>
            <kbd className="rounded border bg-gray-100 px-1 ml-1">↓</kbd>
            <span className="ml-1">навигация</span>
          </span>
          <span>
            <kbd className="rounded border bg-gray-100 px-1">Enter</kbd>
            <span className="ml-1">выбрать</span>
          </span>
          <span>
            <kbd className="rounded border bg-gray-100 px-1">Esc</kbd>
            <span className="ml-1">закрыть</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    LEAD: 'Лид',
    QUALIFICATION: 'Квалификация',
    BRIEFING: 'Брифинг',
    IN_PROGRESS: 'В работе',
    ON_HOLD: 'На паузе',
    COMPLETED: 'Завершён',
    REJECTED: 'Отклонён',
    ARCHIVED: 'Архив',
  }
  return labels[status] || status
}

function getTaskStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    BACKLOG: 'Бэклог',
    TODO: 'К выполнению',
    IN_PROGRESS: 'В работе',
    IN_REVIEW: 'На проверке',
    COMPLETED: 'Выполнено',
  }
  return labels[status] || status
}
