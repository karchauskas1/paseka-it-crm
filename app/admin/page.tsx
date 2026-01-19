import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminClient from './admin-client'

export default async function AdminPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Only admins can access this page
  if (user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const workspaceMember = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: {
      workspace: {
        include: {
          _count: {
            select: {
              members: true,
              projects: true,
              clients: true,
            },
          },
        },
      },
    },
  })

  if (!workspaceMember) {
    redirect('/dashboard')
  }

  const workspace = workspaceMember.workspace

  const users = await db.user.findMany({
    where: {
      workspaces: {
        some: {
          workspaceId: workspace.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // Get task and project counts for each user
  const usersWithCounts = await Promise.all(
    users.map(async (user) => {
      const tasksCount = await db.task.count({
        where: { assigneeId: user.id, workspaceId: workspace.id },
      })
      const projectsCount = await db.project.count({
        where: {
          tasks: {
            some: { assigneeId: user.id },
          },
          workspaceId: workspace.id,
        },
      })
      return {
        ...user,
        _count: {
          tasks: tasksCount,
          projects: projectsCount,
        },
      }
    })
  )

  // Adapt _count for the client (members -> users)
  const workspaceWithCount = {
    ...workspace,
    _count: {
      users: workspace._count.members,
      projects: workspace._count.projects,
      clients: workspace._count.clients,
    },
  }

  return (
    <AdminClient
      user={user}
      workspace={workspaceWithCount}
      users={usersWithCounts}
    />
  )
}
