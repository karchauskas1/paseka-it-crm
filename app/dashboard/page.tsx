import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's first workspace
  const workspaceMember = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: {
      workspace: true,
    },
  })

  if (!workspaceMember) {
    // Create default workspace if none exists
    const workspace = await db.workspace.create({
      data: {
        name: 'My Workspace',
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    })

    return redirect('/dashboard')
  }

  const workspaceId = workspaceMember.workspace.id

  // Get dashboard metrics
  const [
    totalProjects,
    activeProjects,
    completedProjects,
    totalTasks,
    completedTasks,
    recentProjects,
  ] = await Promise.all([
    db.project.count({ where: { workspaceId } }),
    db.project.count({
      where: { workspaceId, status: 'IN_PROGRESS' },
    }),
    db.project.count({
      where: { workspaceId, status: 'COMPLETED' },
    }),
    db.task.count({ where: { workspaceId } }),
    db.task.count({
      where: { workspaceId, status: 'COMPLETED' },
    }),
    db.project.findMany({
      where: { workspaceId },
      include: {
        client: true,
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])

  const metrics = {
    totalProjects,
    activeProjects,
    completedProjects,
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
  }

  // Serialize dates to avoid Next.js serialization errors
  const serializedProjects = recentProjects.map((project) => ({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    startDate: project.startDate?.toISOString() || null,
    endDatePlan: project.endDatePlan?.toISOString() || null,
    endDateFact: project.endDateFact?.toISOString() || null,
  }))

  return (
    <DashboardClient
      user={user}
      workspace={{
        ...workspaceMember.workspace,
        role: workspaceMember.role,
      }}
      metrics={metrics}
      recentProjects={serializedProjects}
    />
  )
}
