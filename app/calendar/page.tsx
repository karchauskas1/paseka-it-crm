import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import CalendarClient from './calendar-client'

export default async function CalendarPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const workspaceMember = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  })

  if (!workspaceMember) {
    redirect('/dashboard')
  }

  // Получаем проекты и клиентов для создания событий
  const [projects, clients] = await Promise.all([
    db.project.findMany({
      where: { workspaceId: workspaceMember.workspaceId, isTemplate: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.client.findMany({
      where: { workspaceId: workspaceMember.workspaceId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <CalendarClient
      user={user}
      workspace={workspaceMember.workspace}
      projects={projects}
      clients={clients}
    />
  )
}
