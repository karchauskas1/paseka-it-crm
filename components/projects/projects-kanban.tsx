'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'

interface Project {
  id: string
  name: string
  status: string
  type: string
  budget: number | null
  client: { name: string } | null
  _count: { tasks: number }
}

interface ProjectsKanbanProps {
  projects: Project[]
  onStatusChange: (projectId: string, newStatus: string) => Promise<void>
}

const statusColumns = [
  { id: 'LEAD', label: 'Лид', color: 'bg-gray-100' },
  { id: 'QUALIFICATION', label: 'Квалификация', color: 'bg-yellow-50' },
  { id: 'BRIEFING', label: 'Брифинг', color: 'bg-blue-50' },
  { id: 'IN_PROGRESS', label: 'В работе', color: 'bg-indigo-50' },
  { id: 'ON_HOLD', label: 'На паузе', color: 'bg-orange-50' },
  { id: 'COMPLETED', label: 'Завершён', color: 'bg-green-50' },
  { id: 'REJECTED', label: 'Отклонён', color: 'bg-red-50' },
]

export function ProjectsKanban({ projects, onStatusChange }: ProjectsKanbanProps) {
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find((p) => p.id === event.active.id)
    if (project) {
      setActiveProject(project)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveProject(null)

    if (!over) return

    const projectId = active.id as string
    const newStatus = over.id as string

    const project = projects.find((p) => p.id === projectId)
    if (project && project.status !== newStatus && statusColumns.some((col) => col.id === newStatus)) {
      await onStatusChange(projectId, newStatus)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map((column) => {
          const columnProjects = projects.filter((p) => p.status === column.id)

          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.label}
              color={column.color}
              count={columnProjects.length}
            >
              <SortableContext
                items={columnProjects.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {columnProjects.map((project) => (
                  <KanbanCard key={project.id} project={project} />
                ))}
              </SortableContext>
            </KanbanColumn>
          )
        })}
      </div>

      <DragOverlay>
        {activeProject && <KanbanCard project={activeProject} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  id,
  title,
  color,
  count,
  children,
}: {
  id: string
  title: string
  color: string
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useSortable({
    id,
    data: { type: 'column' },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 ${color} rounded-lg ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm text-gray-900">{title}</h3>
          <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
      </div>
      <div className="p-2 space-y-2 min-h-[200px]">{children}</div>
    </div>
  )
}

function KanbanCard({ project, isDragging }: { project: Project; isDragging?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg shadow-sm border p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
      }`}
    >
      <Link
        href={`/projects/${project.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
        <h4 className="font-medium text-sm text-gray-900 mb-1 hover:text-blue-600">
          {project.name}
        </h4>
      </Link>
      <p className="text-xs text-gray-500 mb-2">{project.client?.name || 'Без клиента'}</p>
      <div className="flex items-center justify-between">
        <Badge variant={getTypeVariant(project.type)} className="text-xs">
          {getTypeLabel(project.type)}
        </Badge>
        {project.budget && (
          <span className="text-xs text-gray-500">
            {project.budget.toLocaleString('ru-RU')} ₽
          </span>
        )}
      </div>
    </div>
  )
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
