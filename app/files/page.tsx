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

  const workspaceId = workspaceMember.workspaceId

  // Get all projects with their files
  const projects = await db.project.findMany({
    where: { workspaceId },
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

  // Get workspace files (general storage, not attached to any project)
  const workspaceFiles = await db.projectFile.findMany({
    where: {
      workspaceId,
      projectId: null,
    },
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

  const serializedWorkspaceFiles = workspaceFiles.map((file) => ({
    ...file,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  }))

  // Calculate total stats (project files + workspace files)
  const projectFilesCount = projects.reduce((acc, p) => acc + p.files.length, 0)
  const projectFilesSize = projects.reduce(
    (acc, p) => acc + p.files.reduce((sum, f) => sum + f.size, 0),
    0
  )
  const workspaceFilesSize = workspaceFiles.reduce((sum, f) => sum + f.size, 0)

  const totalFiles = projectFilesCount + workspaceFiles.length
  const totalSize = projectFilesSize + workspaceFilesSize

  return (
    <FilesPageClient
      projects={serializedProjects}
      workspaceFiles={serializedWorkspaceFiles}
      user={user}
      workspace={workspaceMember.workspace}
      totalFiles={totalFiles}
      totalSize={totalSize}
    />
  )
}
