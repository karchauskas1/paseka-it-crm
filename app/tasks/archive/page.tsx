import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import TaskArchiveClient from './archive-client'

export default async function TaskArchivePage() {
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
    where: {
      workspaceId: workspaceMember.workspaceId,
      isArchived: true,
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignee: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { archivedAt: 'desc' },
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

  // Serialize dates
  const serializedTasks = tasks.map((task) => ({
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    dueDate: task.dueDate?.toISOString() || null,
    completedAt: task.completedAt?.toISOString() || null,
    archivedAt: task.archivedAt?.toISOString() || null,
  }))

  return (
    <TaskArchiveClient
      user={user}
      workspace={workspaceMember.workspace}
      tasks={serializedTasks}
      projects={projects}
      teamMembers={teamMembers.map((m) => m.user)}
    />
  )
}
