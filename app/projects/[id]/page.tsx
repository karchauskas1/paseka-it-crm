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

  // Serialize all dates to avoid Next.js serialization errors
  const serializedProject = {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    startDate: project.startDate?.toISOString() || null,
    endDatePlan: project.endDatePlan?.toISOString() || null,
    endDateFact: project.endDateFact?.toISOString() || null,
    // AI fields
    aiPainAnalyzedAt: project.aiPainAnalyzedAt?.toISOString() || null,
    aiArchitectureAt: project.aiArchitectureAt?.toISOString() || null,
    aiSummaryAt: project.aiSummaryAt?.toISOString() || null,
    aiInsightsAt: project.aiInsightsAt?.toISOString() || null,
    tasks: project.tasks.map((task) => ({
      ...task,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      dueDate: task.dueDate?.toISOString() || null,
      completedAt: task.completedAt?.toISOString() || null,
    })),
    architectureVersions: project.architectureVersions.map((av) => ({
      ...av,
      createdAt: av.createdAt.toISOString(),
    })),
    milestones: project.milestones.map((m) => ({
      ...m,
      dueDate: m.dueDate?.toISOString() || null,
      completedAt: m.completedAt?.toISOString() || null,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    documents: project.documents.map((d) => ({
      ...d,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
    files: project.files.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    comments: project.comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  }

  return (
    <ProjectDetailClient
      project={serializedProject}
      user={user}
      teamMembers={teamMembers}
      workspace={workspaceMember?.workspace}
    />
  )
}
