import { redirect } from 'next/navigation'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'
import { db } from '@/lib/db'
import TaskDetailClient from './task-detail-client'

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) redirect('/login')

  const task = await db.task.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      subtasks: {
        orderBy: { createdAt: 'asc' },
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!task || task.workspaceId !== workspace.id) {
    redirect('/tasks')
  }

  // Get team members for assignee selection
  const teamMembers = await db.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  return (
    <TaskDetailClient
      task={task}
      user={user}
      workspace={workspace}
      teamMembers={teamMembers.map((m) => m.user)}
    />
  )
}
