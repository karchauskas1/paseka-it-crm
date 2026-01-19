import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import ActivityClient from './activity-client'

export default async function ActivityPage() {
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

  // Получаем пользователей workspace для фильтра
  const workspaceMembers = await db.workspaceMember.findMany({
    where: { workspaceId: workspaceMember.workspaceId },
    include: { user: { select: { id: true, name: true } } },
  })

  return (
    <ActivityClient
      user={user}
      workspace={workspaceMember.workspace}
      workspaceMembers={workspaceMembers.map((m) => m.user)}
    />
  )
}
