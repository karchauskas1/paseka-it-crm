import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import ProjectsClient from './projects-client'

export default async function ProjectsPage() {
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

  const [projects, clients] = await Promise.all([
    db.project.findMany({
      where: { workspaceId: workspaceMember.workspace.id },
      include: {
        client: true,
        _count: {
          select: {
            tasks: true,
            comments: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    db.client.findMany({
      where: { workspaceId: workspaceMember.workspace.id },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <ProjectsClient
      user={user}
      workspace={workspaceMember.workspace}
      projects={projects}
      clients={clients}
    />
  )
}
