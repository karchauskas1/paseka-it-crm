import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import ProjectDetailClient from './project-detail-client'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: true,
      tasks: {
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              comments: true,
              subtasks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      architectureVersions: {
        orderBy: {
          version: 'desc',
        },
      },
      milestones: {
        orderBy: {
          order: 'asc',
        },
      },
      documents: {
        orderBy: {
          uploadedAt: 'desc',
        },
      },
      comments: {
        include: {
          author: {
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
  })

  if (!project) {
    redirect('/projects')
  }

  const workspaceMember = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: {
      workspace: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  })

  const teamMembers = workspaceMember?.workspace.members.map((m) => m.user) || []

  return (
    <ProjectDetailClient
      project={project}
      user={user}
      teamMembers={teamMembers}
    />
  )
}
