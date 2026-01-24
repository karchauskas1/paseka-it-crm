import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import TouchesClient from './touches-client'

export const metadata = {
  title: 'Касания | PASEKA IT CRM',
  description: 'Отслеживание контактов и касаний',
}

export default async function TouchesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const workspaceMember = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: {
      workspace: true,
    },
  })

  if (!workspaceMember) {
    redirect('/login')
  }

  // Получаем всех членов workspace для выбора ответственного
  const workspaceMembers = await db.workspaceMember.findMany({
    where: { workspaceId: workspaceMember.workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  const members = workspaceMembers.map((m) => ({
    id: m.user.id,
    name: m.user.name,
  }))

  return (
    <TouchesClient
      user={user}
      workspace={workspaceMember.workspace}
      userRole={workspaceMember.role}
      members={members}
    />
  )
}
