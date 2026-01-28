'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface Project {
  id: string
  name: string
  status: string
  type: string
  startDate: string | null
  endDatePlan: string | null
  client: { name: string } | null
}

interface ProjectsTimelineProps {
  projects: Project[]
}

export function ProjectsTimeline({ projects }: ProjectsTimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const projectsWithDates = useMemo(() => {
    return projects.filter((p) => p.startDate && p.endDatePlan)
  }, [projects])

  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  return (
    <div className="bg-card rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-muted">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Сегодня
          </Button>
        </div>
        <h3 className="font-semibold text-foreground">
          {format(currentDate, 'LLLL yyyy', { locale: ru })}
        </h3>
        <div className="text-sm text-muted-foreground">
          {projectsWithDates.length} проектов с датами
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Days Header */}
          <div className="flex border-b">
            <div className="w-48 flex-shrink-0 px-3 py-2 font-medium text-sm text-muted-foreground bg-muted border-r">
              Проект
            </div>
            <div className="flex-1 flex">
              {days.map((day, index) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                const isWeekend = day.getDay() === 0 || day.getDay() === 6

                return (
                  <div
                    key={index}
                    className={`flex-1 min-w-[30px] px-1 py-2 text-center text-xs border-r last:border-r-0 ${
                      isToday
                        ? 'bg-blue-100 font-bold text-blue-700'
                        : isWeekend
                        ? 'bg-muted text-muted-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <div>{format(day, 'd')}</div>
                    <div className="text-[10px]">{format(day, 'EEE', { locale: ru })}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Project Rows */}
          {projectsWithDates.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              Нет проектов с указанными датами начала и окончания
            </div>
          ) : (
            projectsWithDates.map((project) => (
              <TimelineRow
                key={project.id}
                project={project}
                monthStart={monthStart}
                monthEnd={monthEnd}
                daysCount={days.length}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function TimelineRow({
  project,
  monthStart,
  monthEnd,
  daysCount,
}: {
  project: Project
  monthStart: Date
  monthEnd: Date
  daysCount: number
}) {
  const projectStart = project.startDate ? new Date(project.startDate) : null
  const projectEnd = project.endDatePlan ? new Date(project.endDatePlan) : null

  if (!projectStart || !projectEnd) return null

  // Вычисляем позицию и ширину бара
  const monthStartTime = monthStart.getTime()
  const monthEndTime = monthEnd.getTime()
  const monthDuration = monthEndTime - monthStartTime

  const barStart = Math.max(projectStart.getTime(), monthStartTime)
  const barEnd = Math.min(projectEnd.getTime(), monthEndTime)

  // Проверяем, попадает ли проект в текущий месяц
  if (barStart > monthEndTime || barEnd < monthStartTime) {
    return null
  }

  const leftPercent = ((barStart - monthStartTime) / monthDuration) * 100
  const widthPercent = ((barEnd - barStart) / monthDuration) * 100

  const statusColors: Record<string, string> = {
    LEAD: 'bg-gray-400',
    QUALIFICATION: 'bg-yellow-400',
    BRIEFING: 'bg-blue-400',
    IN_PROGRESS: 'bg-indigo-500',
    ON_HOLD: 'bg-orange-400',
    COMPLETED: 'bg-green-500',
    REJECTED: 'bg-red-400',
    ARCHIVED: 'bg-gray-300',
  }

  return (
    <div className="flex border-b hover:bg-muted">
      <div className="w-48 flex-shrink-0 px-3 py-2 border-r">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
        >
          {project.name}
        </Link>
        <p className="text-xs text-muted-foreground truncate">{project.client?.name}</p>
      </div>
      <div className="flex-1 relative py-2">
        <div
          className={`absolute h-6 rounded ${statusColors[project.status] || 'bg-gray-400'} opacity-80 hover:opacity-100 transition-opacity`}
          style={{
            left: `${leftPercent}%`,
            width: `${Math.max(widthPercent, 2)}%`,
          }}
          title={`${project.name}: ${format(projectStart, 'd MMM', { locale: ru })} - ${format(projectEnd, 'd MMM', { locale: ru })}`}
        >
          <div className="px-2 py-1 text-xs text-white truncate">
            {project.name}
          </div>
        </div>
      </div>
    </div>
  )
}
