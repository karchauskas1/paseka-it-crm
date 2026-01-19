'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Activity, X, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: string
  description: string
  createdAt: string
  user: { name: string } | null
}

interface ActivitySidebarProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

const activityTypeIcons: Record<string, string> = {
  PROJECT_CREATED: 'Создание',
  PROJECT_UPDATED: 'Обновление',
  STATUS_CHANGED: 'Статус',
  TASK_CREATED: 'Новая задача',
  TASK_UPDATED: 'Задача',
  TASK_COMPLETED: 'Выполнено',
  COMMENT_ADDED: 'Комментарий',
}

export function ActivitySidebar({ projectId, isOpen, onClose }: ActivitySidebarProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchActivities()
    }
  }, [isOpen, projectId])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/activity?entityType=PROJECT&entityId=${projectId}&limit=50`
      )
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-white shadow-xl border-l z-50 transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            История активности
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-64px)] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Нет активности
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => {
                const showDate =
                  index === 0 ||
                  format(new Date(activity.createdAt), 'yyyy-MM-dd') !==
                    format(new Date(activities[index - 1].createdAt), 'yyyy-MM-dd')

                return (
                  <div key={activity.id}>
                    {showDate && (
                      <div className="text-xs font-medium text-gray-500 mb-2">
                        {format(new Date(activity.createdAt), 'd MMMM yyyy', {
                          locale: ru,
                        })}
                      </div>
                    )}
                    <div className="flex gap-3 relative">
                      {/* Timeline line */}
                      {index < activities.length - 1 && (
                        <div className="absolute left-[7px] top-5 bottom-0 w-0.5 bg-gray-200" />
                      )}

                      {/* Dot */}
                      <div className="relative">
                        <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500 flex-shrink-0" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="text-xs text-gray-500 mb-0.5">
                          {format(new Date(activity.createdAt), 'HH:mm')}
                          {activity.user && (
                            <span className="ml-1">• {activity.user.name}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-900">
                          <span className="font-medium text-blue-600 mr-1">
                            {activityTypeIcons[activity.type] || activity.type}
                          </span>
                          {activity.description}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          onClick={() => onClose()}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-white shadow-lg border rounded-l-lg p-2 z-30 hover:bg-gray-50 transition-colors"
          title="История активности"
        >
          <Activity className="h-5 w-5 text-gray-600" />
        </button>
      )}
    </>
  )
}
