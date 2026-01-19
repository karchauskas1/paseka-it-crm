import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

/**
 * GET /api/clients/[id]/analytics
 * Получить аналитику клиента
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Verify client belongs to workspace
    const client = await db.client.findFirst({
      where: { id, workspaceId: workspace.id },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get all projects for this client
    const projects = await db.project.findMany({
      where: { clientId: id },
      select: {
        id: true,
        name: true,
        status: true,
        revenue: true,
        budget: true,
        createdAt: true,
      },
    })

    // Calculate statistics
    const totalProjects = projects.length
    const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length
    const activeProjects = projects.filter((p) =>
      ['IN_PROGRESS', 'BRIEFING', 'QUALIFICATION'].includes(p.status)
    ).length
    const rejectedProjects = projects.filter((p) => p.status === 'REJECTED').length

    const totalRevenue = projects
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + (p.revenue || 0), 0)

    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)

    // Average check (средний чек) - только завершенные проекты
    const avgCheck = completedProjects > 0 ? totalRevenue / completedProjects : 0

    // Win rate
    const winRate = totalProjects > 0
      ? (completedProjects / (completedProjects + rejectedProjects)) * 100
      : 0

    // Revenue by month (last 12 months)
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const revenueByMonth: Array<{ month: string; revenue: number }> = []
    for (let i = 0; i < 12; i++) {
      const date = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const monthRevenue = projects
        .filter((p) => {
          if (p.status !== 'COMPLETED') return false
          // Use createdAt as approximation since completedAt doesn't exist
          const completedDate = new Date(p.createdAt)
          return completedDate >= monthStart && completedDate <= monthEnd
        })
        .reduce((sum, p) => sum + (p.revenue || 0), 0)

      revenueByMonth.push({
        month: date.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
      })
    }

    // Projects by status
    const projectsByStatus = [
      { status: 'LEAD', label: 'Лид', count: projects.filter((p) => p.status === 'LEAD').length },
      { status: 'QUALIFICATION', label: 'Квалификация', count: projects.filter((p) => p.status === 'QUALIFICATION').length },
      { status: 'BRIEFING', label: 'Брифинг', count: projects.filter((p) => p.status === 'BRIEFING').length },
      { status: 'IN_PROGRESS', label: 'В работе', count: projects.filter((p) => p.status === 'IN_PROGRESS').length },
      { status: 'ON_HOLD', label: 'На паузе', count: projects.filter((p) => p.status === 'ON_HOLD').length },
      { status: 'COMPLETED', label: 'Завершён', count: completedProjects },
      { status: 'REJECTED', label: 'Отклонён', count: rejectedProjects },
    ].filter((s) => s.count > 0)

    // Last activity
    const lastProject = projects.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]

    return NextResponse.json({
      totalProjects,
      completedProjects,
      activeProjects,
      rejectedProjects,
      totalRevenue,
      totalBudget,
      avgCheck,
      winRate,
      revenueByMonth,
      projectsByStatus,
      lastActivity: lastProject?.createdAt || null,
    })
  } catch (error) {
    console.error('Error fetching client analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
