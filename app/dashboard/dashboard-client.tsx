'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  MetricsGrid,
  ProjectFunnel,
  ActivityFeed,
  TodayTasks,
  UpcomingDeadlines,
  TeamWorkload,
  PeriodSelector,
} from '@/components/dashboard'
import { AppLayout } from '@/components/layout'
import { RefreshCw } from 'lucide-react'

interface DashboardClientProps {
  user: any
  workspace: any
  metrics: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    totalTasks: number
    completedTasks: number
    completionRate: number
  }
  recentProjects: any[]
}

interface ExtendedMetrics {
  funnel: Array<{ status: string; count: number }>
  metrics: {
    currentPeriodProjects: number
    prevPeriodProjects: number
    projectsChange: number
    currentRevenue: number
    previousRevenue: number
    revenueChange: number
    activeBudget: number
    activeProjectsCount: number
    winRate: number
    avgCycleDays: number
    overdueTasks: number
  }
  teamWorkload: Array<{ userId: string; name: string; tasksInProgress: number }>
  todayTasks: any[]
  upcomingDeadlines: any[]
  recentActivities: any[]
}

export default function DashboardClient({
  user,
  workspace,
  metrics,
  recentProjects,
}: DashboardClientProps) {
  const [period, setPeriod] = useState('month')
  const [extendedMetrics, setExtendedMetrics] = useState<ExtendedMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchExtendedMetrics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/metrics?period=${period}`)
      if (res.ok) {
        const data = await res.json()
        setExtendedMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch extended metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExtendedMetrics()
  }, [period])

  return (
    <AppLayout user={user} workspace={workspace} currentPage="/dashboard" userRole={user.role}>
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Привет, {user.name?.split(' ')[0] || 'User'}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Обзор вашей работы
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <PeriodSelector value={period} onChange={setPeriod} />
          <Button
            variant="outline"
            size="icon"
            onClick={fetchExtendedMetrics}
            disabled={loading}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Extended Metrics Grid */}
      {extendedMetrics && (
        <div className="mb-8">
          <MetricsGrid metrics={extendedMetrics.metrics} period={period} />
        </div>
      )}

      {/* Main Grid Layout - Mobile optimized */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Tasks - Show first on mobile */}
        <div className="md:order-2 lg:order-2 space-y-4 md:space-y-6">
          {extendedMetrics && <TodayTasks tasks={extendedMetrics.todayTasks} />}
          {extendedMetrics && <UpcomingDeadlines tasks={extendedMetrics.upcomingDeadlines} />}
        </div>

        {/* Funnel */}
        <div className="md:order-1 lg:order-1">
          {extendedMetrics && <ProjectFunnel funnel={extendedMetrics.funnel} />}
        </div>

        {/* Team & Activity */}
        <div className="md:order-3 lg:order-3 md:col-span-2 lg:col-span-1 space-y-4 md:space-y-6">
          {extendedMetrics && <TeamWorkload members={extendedMetrics.teamWorkload} />}
          {extendedMetrics && <ActivityFeed activities={extendedMetrics.recentActivities} />}
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-card rounded-lg shadow border">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Последние проекты</h3>
          <Link href="/projects">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              Все проекты
            </Button>
          </Link>
        </div>
        <div className="divide-y">
          {recentProjects.length === 0 ? (
            <div className="px-4 sm:px-6 py-8 text-center text-muted-foreground">
              <p>Нет проектов</p>
              <Link href="/projects/new">
                <Button className="mt-4">Создать первый проект</Button>
              </Link>
            </div>
          ) : (
            recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block px-4 sm:px-6 py-3 sm:py-4 hover:bg-muted/50 active:bg-muted transition-colors touch-manipulation"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-foreground truncate">{project.name}</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                      {project.client.name} • {project._count.tasks} задач
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded shrink-0 ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {getStatusLabel(project.status)}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    LEAD: 'bg-gray-100 text-gray-800',
    QUALIFICATION: 'bg-yellow-100 text-yellow-800',
    BRIEFING: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
    ON_HOLD: 'bg-orange-100 text-orange-800',
    COMPLETED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    ARCHIVED: 'bg-gray-100 text-gray-600',
  }
  return colors[status] || colors.LEAD
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
