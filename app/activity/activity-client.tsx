'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  ArrowRight,
  User,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { UserMenu } from '@/components/layout/user-menu'
import { FeedbackButton } from '@/components/feedback'

interface Activity {
  id: string
  type: string
  entityType: string
  entityId: string
  action: string
  oldValue: any
  newValue: any
  createdAt: string
  user: { id: string; name: string }
  project: { id: string; name: string } | null
}

interface ActivityClientProps {
  user: any
  workspace: any
  workspaceMembers: Array<{ id: string; name: string }>
}

export default function ActivityClient({
  user,
  workspace,
  workspaceMembers,
}: ActivityClientProps) {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [groupedByDay, setGroupedByDay] = useState<Record<string, Activity[]>>({})
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL')
  const [userFilter, setUserFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchActivities = async (reset = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      params.set('offset', reset ? '0' : offset.toString())

      if (typeFilter !== 'ALL') params.set('type', typeFilter)
      if (entityTypeFilter !== 'ALL') params.set('entityType', entityTypeFilter)
      if (userFilter !== 'ALL') params.set('userId', userFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/activity?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (reset) {
          setActivities(data.activities)
          setGroupedByDay(data.groupedByDay)
          setOffset(data.activities.length)
        } else {
          setActivities((prev) => [...prev, ...data.activities])
          setGroupedByDay((prev) => {
            const merged = { ...prev }
            Object.entries(data.groupedByDay as Record<string, Activity[]>).forEach(([date, acts]) => {
              if (merged[date]) {
                merged[date] = [...merged[date], ...acts]
              } else {
                merged[date] = acts
              }
            })
            return merged
          })
          setOffset((prev) => prev + data.activities.length)
        }
        setTotal(data.total)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities(true)
  }, [typeFilter, entityTypeFilter, userFilter, dateFrom, dateTo])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const activityTypes = [
    { value: 'ALL', label: 'Все типы' },
    { value: 'CREATE', label: 'Создание' },
    { value: 'UPDATE', label: 'Обновление' },
    { value: 'DELETE', label: 'Удаление' },
    { value: 'COMMENT', label: 'Комментарий' },
    { value: 'STATUS_CHANGE', label: 'Смена статуса' },
    { value: 'ASSIGNMENT', label: 'Назначение' },
  ]

  const entityTypes = [
    { value: 'ALL', label: 'Все сущности' },
    { value: 'project', label: 'Проекты' },
    { value: 'task', label: 'Задачи' },
    { value: 'client', label: 'Клиенты' },
    { value: 'comment', label: 'Комментарии' },
    { value: 'milestone', label: 'Вехи' },
  ]

  const sortedDays = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PASEKA IT CRM</h1>
              <p className="text-sm text-gray-600">{workspace.name}</p>
            </div>
            <UserMenu user={user} workspace={workspace} userRole={user.role} />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/dashboard"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Dashboard
            </Link>
            <Link
              href="/projects"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Проекты
            </Link>
            <Link
              href="/clients"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Клиенты
            </Link>
            <Link
              href="/tasks"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Задачи
            </Link>
            <Link
              href="/calendar"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Календарь
            </Link>
            <Link
              href="/activity"
              className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
            >
              Активность
            </Link>
            {(user.role === 'ADMIN' || user.role === 'OWNER') && (
              <Link
                href="/admin"
                className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Администрирование
              </Link>
            )}
            <Link
              href="/guide"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Гайд
            </Link>
            <div className="flex-1" />
            <div className="flex items-center py-2">
              <FeedbackButton workspaceId={workspace.id} />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Активность</h2>
            <p className="mt-1 text-sm text-gray-600">
              {total} записей активности
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Тип действия" />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Сущность" />
              </SelectTrigger>
              <SelectContent>
                {entityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Пользователь" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Все пользователи</SelectItem>
                {workspaceMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-9"
                placeholder="От"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-9"
                placeholder="До"
              />
            </div>
          </div>
        </div>

        {/* Activity List Grouped by Day */}
        <div className="space-y-6">
          {sortedDays.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Нет записей активности
            </div>
          ) : (
            sortedDays.map((day) => (
              <div key={day} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <h3 className="font-medium text-gray-900">
                    {format(parseISO(day), 'd MMMM yyyy', { locale: ru })}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {groupedByDay[day].map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            ))
          )}

          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => fetchActivities(false)}
                disabled={loading}
              >
                {loading ? 'Загрузка...' : 'Загрузить ещё'}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icon = getActivityIcon(activity.type)
  const description = getActivityDescription(activity)
  const link = getActivityLink(activity)

  return (
    <Link href={link} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-medium">{activity.user.name}</span>{' '}
            <span className="text-gray-600">{description}</span>
          </p>
          {activity.project && (
            <p className="text-xs text-gray-500 mt-0.5">
              Проект: {activity.project.name}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {format(new Date(activity.createdAt), 'HH:mm', { locale: ru })}
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
      return <Pencil className={`${iconClasses} text-gray-500`} />
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
