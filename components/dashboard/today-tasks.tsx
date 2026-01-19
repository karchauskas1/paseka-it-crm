'use client'

import Link from 'next/link'
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

interface Task {
  id: string
  title: string
  priority: string
  status: string
  dueDate: string
  project?: { name: string } | null
  assignee?: { name: string } | null
}

interface TodayTasksProps {
  tasks: Task[]
}

export function TodayTasks({ tasks }: TodayTasksProps) {
  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">Задачи на сегодня</h3>
        </div>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
            Нет задач на сегодня
          </div>
        ) : (
          tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))
        )}
      </div>
      {tasks.length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <Link
            href="/tasks?due=today"
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Показать все
          </Link>
        </div>
      )}
    </div>
  )
}

function TaskItem({ task }: { task: Task }) {
  const priorityConfig = getPriorityConfig(task.priority)

  return (
    <Link
      href={`/tasks?id=${task.id}`}
      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${priorityConfig.iconColor}`}>
          {priorityConfig.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {task.project && (
              <span className="text-xs text-gray-500 truncate">
                {task.project.name}
              </span>
            )}
            {task.assignee && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">
                  {task.assignee.name}
                </span>
              </>
            )}
          </div>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${priorityConfig.badgeColor}`}>
          {priorityConfig.label}
        </span>
      </div>
    </Link>
  )
}

function getPriorityConfig(priority: string) {
  switch (priority) {
    case 'URGENT':
      return {
        label: 'Срочно',
        icon: <AlertTriangle className="h-4 w-4" />,
        iconColor: 'text-red-500',
        badgeColor: 'bg-red-100 text-red-700',
      }
    case 'HIGH':
      return {
        label: 'Высокий',
        icon: <Clock className="h-4 w-4" />,
        iconColor: 'text-orange-500',
        badgeColor: 'bg-orange-100 text-orange-700',
      }
    case 'MEDIUM':
      return {
        label: 'Средний',
        icon: <Clock className="h-4 w-4" />,
        iconColor: 'text-blue-500',
        badgeColor: 'bg-blue-100 text-blue-700',
      }
    default:
      return {
        label: 'Низкий',
        icon: <Clock className="h-4 w-4" />,
        iconColor: 'text-gray-400',
        badgeColor: 'bg-gray-100 text-gray-600',
      }
  }
}
