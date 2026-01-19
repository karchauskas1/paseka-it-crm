'use client'

import Link from 'next/link'

interface ProjectFunnelProps {
  funnel: Array<{
    status: string
    count: number
  }>
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  LEAD: { label: 'Лид', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  QUALIFICATION: { label: 'Квалификация', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  BRIEFING: { label: 'Брифинг', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  IN_PROGRESS: { label: 'В работе', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  ON_HOLD: { label: 'На паузе', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  COMPLETED: { label: 'Завершён', color: 'text-green-700', bgColor: 'bg-green-100' },
  REJECTED: { label: 'Отклонён', color: 'text-red-700', bgColor: 'bg-red-100' },
  ARCHIVED: { label: 'Архив', color: 'text-gray-500', bgColor: 'bg-gray-50' },
}

export function ProjectFunnel({ funnel }: ProjectFunnelProps) {
  const total = funnel.reduce((sum, item) => sum + item.count, 0)
  const maxCount = Math.max(...funnel.map((f) => f.count), 1)

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-4 py-3 border-b">
        <h3 className="text-base font-semibold text-gray-900">Воронка проектов</h3>
        <p className="text-xs text-gray-500 mt-0.5">Всего: {total} проектов</p>
      </div>
      <div className="p-4 space-y-2">
        {funnel.map(({ status, count }) => {
          const config = statusConfig[status] || { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' }
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0
          const barWidth = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 10 : 0) : 0

          return (
            <Link
              key={status}
              href={`/projects?status=${status}`}
              className="block group"
            >
              <div className="flex items-center gap-3">
                <div className="w-24 flex-shrink-0">
                  <span className={`text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config.bgColor} transition-all duration-300 group-hover:opacity-80 flex items-center justify-end pr-2`}
                    style={{ width: `${barWidth}%` }}
                  >
                    {count > 0 && (
                      <span className={`text-xs font-semibold ${config.color}`}>
                        {count}
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-12 text-right">
                  <span className="text-xs text-gray-500">{percentage}%</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
