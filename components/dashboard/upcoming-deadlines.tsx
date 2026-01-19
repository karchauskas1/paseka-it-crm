'use client'

import Link from 'next/link'
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar, AlertTriangle } from 'lucide-react'

interface Task {
  id: string
  title: string
  priority: string
  status: string
  dueDate: string
  project?: { name: string } | null
  assignee?: { name: string } | null
}

interface UpcomingDeadlinesProps {
  tasks: Task[]
}

export function UpcomingDeadlines({ tasks }: UpcomingDeadlinesProps) {
  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-orange-600" />
          <h3 className="text-base font-semibold text-gray-900">Дедлайны на 7 дней</h3>
        </div>
        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            Нет предстоящих дедлайнов
          </div>
        ) : (
          tasks.map((task) => (
            <DeadlineItem key={task.id} task={task} />
          ))
        )}
      </div>
      {tasks.length > 0 && (
        <div className="px-4 py-2 border-t bg-gray-50">
          <Link
            href="/tasks?view=calendar"
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Открыть календарь
          </Link>
        </div>
      )}
    </div>
  )
}

function DeadlineItem({ task }: { task: Task }) {
  const dueDate = new Date(task.dueDate)
  const daysLeft = differenceInDays(dueDate, new Date())
  const dateLabel = getDateLabel(dueDate)
  const urgency = getUrgency(daysLeft)

  return (
    <Link
      href={`/tasks?id=${task.id}`}
      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${urgency.iconColor}`}>
          {urgency.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs ${urgency.textColor}`}>
              {dateLabel}
            </span>
            {task.project && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500 truncate">
                  {task.project.name}
                </span>
              </>
            )}
          </div>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${urgency.badgeColor}`}>
          {daysLeft === 0 ? 'Сегодня' : daysLeft === 1 ? 'Завтра' : `${daysLeft} дн.`}
        </span>
      </div>
    </Link>
  )
}

function getDateLabel(date: Date): string {
  if (isToday(date)) {
    return 'Сегодня'
  }
  if (isTomorrow(date)) {
    return 'Завтра'
  }
  return format(date, 'd MMMM', { locale: ru })
}

function getUrgency(daysLeft: number) {
  if (daysLeft <= 1) {
    return {
      icon: <AlertTriangle className="h-4 w-4" />,
      iconColor: 'text-red-500',
      textColor: 'text-red-600',
      badgeColor: 'bg-red-100 text-red-700',
    }
  }
  if (daysLeft <= 3) {
    return {
      icon: <Calendar className="h-4 w-4" />,
      iconColor: 'text-orange-500',
      textColor: 'text-orange-600',
      badgeColor: 'bg-orange-100 text-orange-700',
    }
  }
  return {
    icon: <Calendar className="h-4 w-4" />,
    iconColor: 'text-blue-500',
    textColor: 'text-gray-600',
    badgeColor: 'bg-blue-100 text-blue-700',
  }
}
