import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/dashboard/metrics
 * Расширенные метрики для Dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    const workspaceId = workspaceMember.workspaceId

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month' // week, month, quarter, year

    // Вычисляем даты для периода
    const now = new Date()
    let periodStart: Date
    let prevPeriodStart: Date
    let prevPeriodEnd: Date

    switch (period) {
      case 'week':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        prevPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14)
        prevPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'quarter':
        periodStart = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        prevPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case 'year':
        periodStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        prevPeriodStart = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
        prevPeriodEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        break
      default: // month
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        prevPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())
        prevPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    }

    // Параллельно запрашиваем все данные
    const [
      // Воронка проектов
      projectsByStatus,
      // Текущий период
      currentPeriodProjects,
      currentPeriodRevenue,
      // Предыдущий период
      prevPeriodProjects,
      prevPeriodRevenue,
      // Активные проекты и бюджет
      activeProjectsData,
      // Завершённые проекты (для win rate)
      completedProjects,
      rejectedProjects,
      // Просроченные задачи
      overdueTasks,
      // Загрузка команды
      teamWorkload,
      // Задачи на сегодня
      todayTasks,
      // Дедлайны на 7 дней
      upcomingDeadlines,
      // Последние активности
      recentActivities,
    ] = await Promise.all([
      // Воронка проектов по статусам
      db.project.groupBy({
        by: ['status'],
        where: { workspaceId, isTemplate: false },
        _count: true,
      }),

      // Проекты за текущий период
      db.project.count({
        where: {
          workspaceId,
          isTemplate: false,
          createdAt: { gte: periodStart },
        },
      }),

      // Выручка за текущий период
      db.project.aggregate({
        where: {
          workspaceId,
          isTemplate: false,
          status: 'COMPLETED',
          updatedAt: { gte: periodStart },
        },
        _sum: { revenue: true },
      }),

      // Проекты за предыдущий период
      db.project.count({
        where: {
          workspaceId,
          isTemplate: false,
          createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
        },
      }),

      // Выручка за предыдущий период
      db.project.aggregate({
        where: {
          workspaceId,
          isTemplate: false,
          status: 'COMPLETED',
          updatedAt: { gte: prevPeriodStart, lt: prevPeriodEnd },
        },
        _sum: { revenue: true },
      }),

      // Активные проекты с бюджетом
      db.project.aggregate({
        where: {
          workspaceId,
          isTemplate: false,
          status: { in: ['IN_PROGRESS', 'BRIEFING', 'QUALIFICATION'] },
        },
        _sum: { budget: true },
        _count: true,
      }),

      // Завершённые проекты (всего)
      db.project.count({
        where: { workspaceId, isTemplate: false, status: 'COMPLETED' },
      }),

      // Отклонённые проекты (всего)
      db.project.count({
        where: { workspaceId, isTemplate: false, status: 'REJECTED' },
      }),

      // Просроченные задачи
      db.task.count({
        where: {
          workspaceId,
          dueDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),

      // Загрузка команды (задачи IN_PROGRESS по пользователям)
      db.task.groupBy({
        by: ['assigneeId'],
        where: {
          workspaceId,
          status: 'IN_PROGRESS',
          assigneeId: { not: null },
        },
        _count: true,
      }),

      // Задачи на сегодня
      db.task.findMany({
        where: {
          workspaceId,
          dueDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
          project: { select: { name: true } },
          assignee: { select: { name: true } },
        },
        orderBy: { priority: 'desc' },
        take: 10,
      }),

      // Дедлайны на 7 дней
      db.task.findMany({
        where: {
          workspaceId,
          dueDate: {
            gte: now,
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
          },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
        include: {
          project: { select: { name: true } },
          assignee: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),

      // Последние активности
      db.activity.findMany({
        where: {
          OR: [
            { workspaceId },
            { project: { workspaceId } },
          ],
        },
        include: {
          user: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ])

    // Получаем имена для команды
    const teamUserIds = teamWorkload
      .map((t) => t.assigneeId)
      .filter((id): id is string => id !== null)

    const teamUsers = teamUserIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: teamUserIds } },
          select: { id: true, name: true },
        })
      : []

    const teamUsersMap = new Map(teamUsers.map((u) => [u.id, u.name]))

    // Формируем воронку
    const funnelOrder = [
      'LEAD',
      'QUALIFICATION',
      'BRIEFING',
      'IN_PROGRESS',
      'ON_HOLD',
      'COMPLETED',
      'REJECTED',
      'ARCHIVED',
    ]

    const funnel = funnelOrder.map((status) => {
      const found = projectsByStatus.find((p) => p.status === status)
      return {
        status,
        count: found?._count ?? 0,
      }
    })

    // Вычисляем метрики
    const currentRevenue = currentPeriodRevenue._sum.revenue ?? 0
    const previousRevenue = prevPeriodRevenue._sum.revenue ?? 0
    const revenueChange =
      previousRevenue > 0
        ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
        : currentRevenue > 0
        ? 100
        : 0

    const winRate =
      completedProjects + rejectedProjects > 0
        ? Math.round((completedProjects / (completedProjects + rejectedProjects)) * 100)
        : 0

    // Вычисляем средний цикл проекта
    const completedProjectsWithDates = await db.project.findMany({
      where: {
        workspaceId,
        isTemplate: false,
        status: 'COMPLETED',
        startDate: { not: null },
        endDateFact: { not: null },
      },
      select: {
        startDate: true,
        endDateFact: true,
      },
      take: 50,
    })

    let avgCycleDays = 0
    if (completedProjectsWithDates.length > 0) {
      const totalDays = completedProjectsWithDates.reduce((sum, p) => {
        if (p.startDate && p.endDateFact) {
          return sum + Math.ceil((p.endDateFact.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24))
        }
        return sum
      }, 0)
      avgCycleDays = Math.round(totalDays / completedProjectsWithDates.length)
    }

    return NextResponse.json({
      funnel,
      metrics: {
        currentPeriodProjects,
        prevPeriodProjects,
        projectsChange: prevPeriodProjects > 0
          ? Math.round(((currentPeriodProjects - prevPeriodProjects) / prevPeriodProjects) * 100)
          : currentPeriodProjects > 0 ? 100 : 0,
        currentRevenue,
        previousRevenue,
        revenueChange,
        activeBudget: activeProjectsData._sum.budget ?? 0,
        activeProjectsCount: activeProjectsData._count,
        winRate,
        avgCycleDays,
        overdueTasks,
      },
      teamWorkload: teamWorkload.map((t) => ({
        userId: t.assigneeId,
        name: t.assigneeId ? teamUsersMap.get(t.assigneeId) || 'Unknown' : 'Unassigned',
        tasksInProgress: t._count,
      })),
      todayTasks,
      upcomingDeadlines,
      recentActivities,
    })
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
