import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import TasksClient from './tasks-client'

export default async function TasksPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const workspaceMember = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  })

  if (!workspaceMember) {
    redirect('/login')
  }

  const tasks = await db.task.findMany({
    where: { workspaceId: workspaceMember.workspaceId },
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignee: {
        select: { id: true, name: true },
      },
      _count: {
        select: { subtasks: true, comments: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const projects = await db.project.findMany({
    where: { workspaceId: workspaceMember.workspaceId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const teamMembers = await db.workspaceMember.findMany({
    where: { workspaceId: workspaceMember.workspaceId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return (
    <TasksClient
      user={user}
      workspace={workspaceMember.workspace}
      tasks={tasks}
      projects={projects}
      teamMembers={teamMembers.map((m) => m.user)}
    />
  )
}
