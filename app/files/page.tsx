import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import FilesPageClient from './files-page-client'

export default async function FilesPage() {
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

  // Get all projects with their files
  const projects = await db.project.findMany({
    where: {
      workspaceId: workspaceMember.workspaceId,
    },
    select: {
      id: true,
      name: true,
      files: {
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  // Serialize dates
  const serializedProjects = projects.map((project) => ({
    ...project,
    files: project.files.map((file) => ({
      ...file,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    })),
  }))

  // Calculate total stats
  const totalFiles = projects.reduce((acc, p) => acc + p.files.length, 0)
  const totalSize = projects.reduce(
    (acc, p) => acc + p.files.reduce((sum, f) => sum + f.size, 0),
    0
  )

  return (
    <FilesPageClient
      projects={serializedProjects}
      user={user}
      workspace={workspaceMember.workspace}
      totalFiles={totalFiles}
      totalSize={totalSize}
    />
  )
}
