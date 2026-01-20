'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, RefreshCw } from 'lucide-react'
import {
  ViewSwitcher,
  type ViewMode,
  ProjectsTable,
  ProjectsKanban,
  ProjectsTimeline,
  ProjectsCards,
} from '@/components/projects'
import { AppLayout } from '@/components/layout'

interface ProjectsClientProps {
  user: any
  workspace: any
  projects: any[]
  clients: any[]
}

export default function ProjectsClient({
  user,
  workspace,
  projects: initialProjects,
  clients,
}: ProjectsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [projects, setProjects] = useState(initialProjects)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'ALL')
  const [clientFilter, setClientFilter] = useState(searchParams.get('clientId') || 'ALL')
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'cards')

  const filteredProjects = projects.filter((project: any) => {
    if (!project || !project.name) return false

    const matchesSearch = project.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter
    const matchesType = typeFilter === 'ALL' || project.type === typeFilter
    const matchesClient = clientFilter === 'ALL' || project.clientId === clientFilter

    return matchesSearch && matchesStatus && matchesType && matchesClient
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const refreshProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects?workspaceId=${workspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Failed to refresh projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = useCallback(async (projectId: string, newStatus: string) => {
    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    )

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        // Revert on error
        await refreshProjects()
      }
    } catch (error) {
      console.error('Failed to update project status:', error)
      await refreshProjects()
    }
  }, [workspace.id])

  const updateURL = (params: Record<string, string>) => {
    const url = new URL(window.location.href)
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'ALL') {
        url.searchParams.set(key, value)
      } else {
        url.searchParams.delete(key)
      }
    })
    router.push(url.pathname + url.search)
  }

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    updateURL({ view: mode })
  }

  const statuses = [
    { value: 'ALL', label: 'Все статусы' },
    { value: 'LEAD', label: 'Лид' },
    { value: 'QUALIFICATION', label: 'Квалификация' },
    { value: 'BRIEFING', label: 'Брифинг' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'ON_HOLD', label: 'На паузе' },
    { value: 'COMPLETED', label: 'Завершён' },
    { value: 'REJECTED', label: 'Отклонён' },
    { value: 'ARCHIVED', label: 'Архив' },
  ]

  const types = [
    { value: 'ALL', label: 'Все типы' },
    { value: 'MONEY', label: 'Деньги' },
    { value: 'GROWTH', label: 'Рост' },
    { value: 'INVESTMENT', label: 'Инвестиции' },
  ]

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/projects" userRole={user.role}>
      <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Проекты</h2>
            <p className="mt-1 text-sm text-gray-600">
              {filteredProjects.length} из {projects.length} проектов
            </p>
          </div>
          <div className="flex items-center gap-4">
            <ViewSwitcher value={viewMode} onChange={handleViewChange} />
            <Button
              variant="outline"
              size="sm"
              onClick={refreshProjects}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Link href="/projects/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Создать проект
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Найти проект..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); updateURL({ status: v }) }}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); updateURL({ type: v }) }}>
              <SelectTrigger>
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={(v) => { setClientFilter(v); updateURL({ clientId: v }) }}>
              <SelectTrigger>
                <SelectValue placeholder="Клиент" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все клиенты</SelectItem>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Projects View */}
        {viewMode === 'cards' && <ProjectsCards projects={filteredProjects} />}
        {viewMode === 'table' && <ProjectsTable projects={filteredProjects} />}
        {viewMode === 'kanban' && (
          <ProjectsKanban projects={filteredProjects} onStatusChange={handleStatusChange} />
        )}
        {viewMode === 'timeline' && <ProjectsTimeline projects={filteredProjects} />}
    </AppLayout>
  )
}
