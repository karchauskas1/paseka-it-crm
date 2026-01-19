import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import ClientsClient from './clients-client'

export default async function ClientsPage() {
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

  const clients = await db.client.findMany({
    where: { workspaceId: workspaceMember.workspaceId },
    include: {
      _count: {
        select: { projects: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <ClientsClient
      user={user}
      workspace={workspaceMember.workspace}
      clients={clients}
    />
  )
}
