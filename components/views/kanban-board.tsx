'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import {
  taskStatusLabels,
  taskStatusColors,
  priorityLabels,
  priorityColors,
} from '@/lib/validations/task'
import { Calendar, User, FolderOpen, GripVertical } from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  project?: { id: string; name: string } | null
  assignee?: { id: string; name: string } | null
}

interface KanbanBoardProps {
  tasks: Task[]
  onStatusChange: (taskId: string, newStatus: string) => void
  onTaskClick?: (task: Task) => void
}

const columns = [
  { id: 'TODO', title: 'К выполнению', color: 'bg-muted' },
  { id: 'IN_PROGRESS', title: 'В работе', color: 'bg-blue-100' },
  { id: 'IN_REVIEW', title: 'На проверке', color: 'bg-purple-100' },
  { id: 'COMPLETED', title: 'Выполнено', color: 'bg-green-100' },
]

function TaskCard({ task, isDragging, onClick }: { task: Task; isDragging?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-lg border p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm text-foreground line-clamp-2">
          {task.title}
        </h4>
        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        <Badge className={`${priorityColors[task.priority]} text-xs`}>
          {priorityLabels[task.priority]}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {task.project && (
            <div className="flex items-center">
              <FolderOpen className="h-3 w-3 mr-1" />
              <span className="truncate max-w-[80px]">{task.project.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div className="flex items-center">
              <User className="h-3 w-3 mr-1" />
              <span className="truncate max-w-[60px]">{task.assignee.name}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(task.dueDate).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableTaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} onClick={onClick} />
    </div>
  )
}

function Column({
  id,
  title,
  color,
  tasks,
  onTaskClick,
}: {
  id: string
  title: string
  color: string
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] max-w-[320px] ${color} rounded-lg p-3 transition-all ${
        isOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className="bg-card rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[200px]">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Перетащите задачу сюда
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function KanbanBoard({ tasks, onStatusChange, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = tasks.filter((task) => task.status === column.id)
    return acc
  }, {} as Record<string, Task[]>)

  // Add tasks with other statuses to appropriate columns
  const otherTasks = tasks.filter(
    (task) => !columns.find((col) => col.id === task.status)
  )
  otherTasks.forEach((task) => {
    if (task.status === 'BLOCKED') {
      tasksByStatus['IN_PROGRESS']?.push(task)
    } else if (task.status === 'CANCELLED') {
      tasksByStatus['COMPLETED']?.push(task)
    }
  })

  const findContainer = (id: string) => {
    if (columns.find((col) => col.id === id)) {
      return id
    }
    for (const [status, statusTasks] of Object.entries(tasksByStatus)) {
      if (statusTasks.find((task) => task.id === id)) {
        return status
      }
    }
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeContainer = findContainer(active.id as string)
    const overContainer = findContainer(over.id as string) || (over.id as string)

    if (
      activeContainer &&
      overContainer &&
      activeContainer !== overContainer &&
      columns.find((col) => col.id === overContainer)
    ) {
      onStatusChange(active.id as string, overContainer)
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
        {columns.map((column) => (
          <Column
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tasks={tasksByStatus[column.id] || []}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
