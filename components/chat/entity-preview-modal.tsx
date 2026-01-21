'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ExternalLink, CheckSquare, FolderKanban, Users } from 'lucide-react'
import Link from 'next/link'

interface EntityPreviewModalProps {
  type: 'task' | 'project' | 'client' | null
  id: string | null
  isOpen: boolean
  onClose: () => void
}

interface TaskPreview {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  project: { id: string; name: string }
  assignee: { name: string | null; email: string } | null
  dueDate: string | null
}

interface ProjectPreview {
  id: string
  name: string
  description: string | null
  status: string
  client: { id: string; name: string } | null
  _count: { tasks: number }
}

interface ClientPreview {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  _count: { projects: number }
}

const statusColors: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-purple-100 text-purple-700',
  DONE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
  LEAD: 'bg-gray-100 text-gray-700',
  DISCOVERY: 'bg-yellow-100 text-yellow-700',
  PROPOSAL: 'bg-orange-100 text-orange-700',
  DEVELOPMENT: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const typeConfig = {
  task: {
    icon: CheckSquare,
    label: 'Задача',
    color: 'text-green-600',
    endpoint: '/api/tasks',
    linkPrefix: '/tasks',
  },
  project: {
    icon: FolderKanban,
    label: 'Проект',
    color: 'text-purple-600',
    endpoint: '/api/projects',
    linkPrefix: '/projects',
  },
  client: {
    icon: Users,
    label: 'Клиент',
    color: 'text-orange-600',
    endpoint: '/api/clients',
    linkPrefix: '/clients',
  },
}

export function EntityPreviewModal({
  type,
  id,
  isOpen,
  onClose,
}: EntityPreviewModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TaskPreview | ProjectPreview | ClientPreview | null>(null)

  useEffect(() => {
    if (!isOpen || !type || !id) {
      setData(null)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const config = typeConfig[type]
        const response = await fetch(`${config.endpoint}/${id}`)

        if (!response.ok) {
          throw new Error('Failed to fetch')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        setError('Не удалось загрузить данные')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, type, id])

  if (!type) return null

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            {config.label}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-muted-foreground">{error}</div>
          )}

          {!loading && !error && data && (
            <>
              {type === 'task' && <TaskPreviewContent data={data as TaskPreview} />}
              {type === 'project' && <ProjectPreviewContent data={data as ProjectPreview} />}
              {type === 'client' && <ClientPreviewContent data={data as ClientPreview} />}

              <div className="mt-4 pt-4 border-t">
                <Button asChild className="w-full">
                  <Link href={`${config.linkPrefix}/${id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Открыть полностью
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TaskPreviewContent({ data }: { data: TaskPreview }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">{data.title}</h3>
        {data.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
            {data.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className={statusColors[data.status] || ''}>
          {data.status}
        </Badge>
        <Badge variant="outline">{data.priority}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Проект</div>
          <div className="font-medium">{data.project.name}</div>
        </div>
        {data.assignee && (
          <div>
            <div className="text-muted-foreground">Исполнитель</div>
            <div className="font-medium">
              {data.assignee.name || data.assignee.email}
            </div>
          </div>
        )}
        {data.dueDate && (
          <div>
            <div className="text-muted-foreground">Срок</div>
            <div className="font-medium">
              {new Date(data.dueDate).toLocaleDateString('ru-RU')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectPreviewContent({ data }: { data: ProjectPreview }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">{data.name}</h3>
        {data.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
            {data.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge className={statusColors[data.status] || ''}>
          {data.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {data.client && (
          <div>
            <div className="text-muted-foreground">Клиент</div>
            <div className="font-medium">{data.client.name}</div>
          </div>
        )}
        <div>
          <div className="text-muted-foreground">Задач</div>
          <div className="font-medium">{data._count.tasks}</div>
        </div>
      </div>
    </div>
  )
}

function ClientPreviewContent({ data }: { data: ClientPreview }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">{data.name}</h3>
        {data.company && (
          <p className="text-sm text-muted-foreground mt-1">{data.company}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {data.email && (
          <div>
            <div className="text-muted-foreground">Email</div>
            <div className="font-medium truncate">{data.email}</div>
          </div>
        )}
        {data.phone && (
          <div>
            <div className="text-muted-foreground">Телефон</div>
            <div className="font-medium">{data.phone}</div>
          </div>
        )}
        <div>
          <div className="text-muted-foreground">Проектов</div>
          <div className="font-medium">{data._count.projects}</div>
        </div>
      </div>
    </div>
  )
}
