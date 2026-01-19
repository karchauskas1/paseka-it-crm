import { redirect } from 'next/navigation'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'
import { db } from '@/lib/db'
import TemplatesClient from './templates-client'

export default async function TemplatesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) redirect('/login')

  const templatesRaw = await db.project.findMany({
    where: {
      workspaceId: workspace.id,
      isTemplate: true,
    },
    include: {
      _count: {
        select: {
          tasks: true,
          milestones: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const templates = templatesRaw.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    startDate: t.startDate?.toISOString() || null,
    endDatePlan: t.endDatePlan?.toISOString() || null,
    endDateFact: t.endDateFact?.toISOString() || null,
  }))

  const clients = await db.client.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <TemplatesClient
      user={user}
      workspace={workspace}
      templates={templates}
      clients={clients}
    />
  )
}
