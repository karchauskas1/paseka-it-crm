import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import CreateProjectClient from './create-project-client'

export default async function NewProjectPage() {
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
    where: {
      workspaceId: workspaceMember.workspaceId,
      status: 'ACTIVE',
    },
    select: { id: true, name: true, company: true },
    orderBy: { name: 'asc' },
  })

  return (
    <CreateProjectClient
      user={user}
      workspace={workspaceMember.workspace}
      clients={clients}
    />
  )
}
