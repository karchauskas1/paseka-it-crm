import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import ClientDetailClient from './client-detail-client'

interface ClientPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientPage({ params }: ClientPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  const workspaceMember = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  })

  if (!workspaceMember) {
    redirect('/dashboard')
  }

  const client = await db.client.findFirst({
    where: {
      id,
      workspaceId: workspaceMember.workspace.id,
    },
    include: {
      projects: {
        include: {
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    },
  })

  if (!client) {
    notFound()
  }

  return (
    <ClientDetailClient
      user={user}
      workspace={workspaceMember.workspace}
      client={client}
    />
  )
}
