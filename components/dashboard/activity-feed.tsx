'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  ArrowRight,
  User,
} from 'lucide-react'

interface Activity {
  id: string
  type: string
  entityType: string
  entityId: string
  action: string
  oldValue?: any
  newValue?: any
  createdAt: string
  user: { name: string }
  project?: { name: string } | null
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-card rounded-lg shadow border">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Последняя активность</h3>
        <Link
          href="/activity"
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Все активности
        </Link>
      </div>
      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            Нет активности
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  )
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icon = getActivityIcon(activity.type)
  const description = getActivityDescription(activity)
  const link = getActivityLink(activity)

  return (
    <Link href={link} className="block px-4 py-3 hover:bg-muted transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-medium">{activity.user.name}</span>{' '}
            <span className="text-muted-foreground">{description}</span>
          </p>
          {activity.project && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {activity.project.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(activity.createdAt), {
              addSuffix: true,
              locale: ru,
            })}
          </p>
        </div>
      </div>
    </Link>
  )
}

function getActivityIcon(type: string) {
  const iconClasses = 'h-4 w-4'

  switch (type) {
    case 'CREATE':
      return <Plus className={`${iconClasses} text-green-500`} />
    case 'UPDATE':
      return <Pencil className={`${iconClasses} text-blue-500`} />
    case 'DELETE':
      return <Trash2 className={`${iconClasses} text-red-500`} />
    case 'COMMENT':
      return <MessageSquare className={`${iconClasses} text-purple-500`} />
    case 'STATUS_CHANGE':
      return <ArrowRight className={`${iconClasses} text-orange-500`} />
    case 'ASSIGNMENT':
      return <User className={`${iconClasses} text-indigo-500`} />
    default:
      return <Pencil className={`${iconClasses} text-muted-foreground`} />
  }
}

function getActivityDescription(activity: Activity): string {
  const entityLabels: Record<string, string> = {
    project: 'проект',
    task: 'задачу',
    client: 'клиента',
    comment: 'комментарий',
    milestone: 'веху',
    document: 'документ',
  }

  const entity = entityLabels[activity.entityType] || activity.entityType

  switch (activity.type) {
    case 'CREATE':
      return `создал(а) ${entity}`
    case 'UPDATE':
      return `обновил(а) ${entity}`
    case 'DELETE':
      return `удалил(а) ${entity}`
    case 'COMMENT':
      return `оставил(а) комментарий`
    case 'STATUS_CHANGE':
      const oldStatus = activity.oldValue?.status || 'неизвестно'
      const newStatus = activity.newValue?.status || 'неизвестно'
      return `изменил(а) статус: ${formatStatus(oldStatus)} → ${formatStatus(newStatus)}`
    case 'ASSIGNMENT':
      return `назначил(а) ответственного`
    default:
      return activity.action
  }
}

function getActivityLink(activity: Activity): string {
  switch (activity.entityType) {
    case 'project':
      return `/projects/${activity.entityId}`
    case 'task':
      return `/tasks?id=${activity.entityId}`
    case 'client':
      return `/clients/${activity.entityId}`
    default:
      return '#'
  }
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    LEAD: 'Лид',
    QUALIFICATION: 'Квалификация',
    BRIEFING: 'Брифинг',
    IN_PROGRESS: 'В работе',
    ON_HOLD: 'На паузе',
    COMPLETED: 'Завершён',
    REJECTED: 'Отклонён',
    ARCHIVED: 'Архив',
    TODO: 'К выполнению',
    IN_REVIEW: 'На проверке',
    BLOCKED: 'Заблокирована',
    CANCELLED: 'Отменена',
  }
  return labels[status] || status
}
