'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  type: string
  budget: number | null
  client: { name: string } | null
  _count: { tasks: number }
}

interface ProjectsCardsProps {
  projects: Project[]
}

export function ProjectsCards({ projects }: ProjectsCardsProps) {
  if (projects.length === 0) {
    return (
      <div className="col-span-full text-center py-12 bg-card rounded-lg shadow">
        <FolderKanban className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-lg font-medium text-foreground">Проекты не найдены</p>
        <Link href="/projects/new">
          <Button className="mt-4">Создать первый проект</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="bg-card rounded-lg shadow hover:shadow-md transition-shadow p-6 block"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-lg text-foreground flex-1 mr-2">
              {project.name}
            </h3>
            <Badge variant={getTypeVariant(project.type)}>
              {getTypeLabel(project.type)}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {project.client?.name || 'Без клиента'}
          </p>

          {project.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {project.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <Badge variant={getStatusVariant(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {project.budget && (
                <span>{project.budget.toLocaleString('ru-RU')} ₽</span>
              )}
              <span>{project._count?.tasks || 0} задач</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' {
  const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive'> = {
    LEAD: 'secondary',
    QUALIFICATION: 'warning',
    BRIEFING: 'info',
    IN_PROGRESS: 'info',
    ON_HOLD: 'warning',
    COMPLETED: 'success',
    REJECTED: 'destructive',
    ARCHIVED: 'secondary',
  }
  return variants[status] || 'secondary'
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

function getTypeVariant(type: string): 'default' | 'secondary' | 'success' | 'warning' | 'info' {
  const variants: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'info'> = {
    MONEY: 'success',
    GROWTH: 'info',
    INVESTMENT: 'warning',
  }
  return variants[type] || 'secondary'
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MONEY: 'Деньги',
    GROWTH: 'Рост',
    INVESTMENT: 'Инвестиции',
  }
  return labels[type] || type
}
