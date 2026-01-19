'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { UserMenu } from '@/components/layout/user-menu'
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
  const router = useRouter()
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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">PASEKA IT CRM</h1>
              <p className="text-sm text-muted-foreground">{workspace.name}</p>
            </div>
            <UserMenu user={user} workspace={workspace} userRole={workspace.role} />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/dashboard"
              className="py-4 px-1 border-b-2 border-primary font-medium text-sm text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/projects"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Проекты
            </Link>
            <Link
              href="/clients"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Клиенты
            </Link>
            <Link
              href="/tasks"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Задачи
            </Link>
            <Link
              href="/calendar"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Календарь
            </Link>
            <Link
              href="/activity"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Активность
            </Link>
            {(user.role === 'ADMIN' || user.role === 'OWNER') && (
              <Link
                href="/admin"
                className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with period selector */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Добро пожаловать, {user.name}!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Обзор вашей работы и текущих проектов
            </p>
          </div>
          <div className="flex items-center gap-4">
            <PeriodSelector value={period} onChange={setPeriod} />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchExtendedMetrics}
              disabled={loading}
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

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Funnel */}
          <div className="lg:col-span-1">
            {extendedMetrics && <ProjectFunnel funnel={extendedMetrics.funnel} />}
          </div>

          {/* Middle Column - Tasks */}
          <div className="lg:col-span-1 space-y-6">
            {extendedMetrics && <TodayTasks tasks={extendedMetrics.todayTasks} />}
            {extendedMetrics && <UpcomingDeadlines tasks={extendedMetrics.upcomingDeadlines} />}
          </div>

          {/* Right Column - Team & Activity */}
          <div className="lg:col-span-1 space-y-6">
            {extendedMetrics && <TeamWorkload members={extendedMetrics.teamWorkload} />}
            {extendedMetrics && <ActivityFeed activities={extendedMetrics.recentActivities} />}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Последние проекты</h3>
            <Link href="/projects">
              <Button variant="outline" size="sm">
                Все проекты
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentProjects.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
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
                  className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{project.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {project.client.name} • {project._count.tasks} задач
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
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
      </main>
    </div>
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
