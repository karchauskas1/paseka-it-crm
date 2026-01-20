import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { PainDetailClient } from './pain-detail-client'

export const metadata: Metadata = {
  title: 'Детали боли | Pain Radar | PASEKA CRM',
}

export default async function PainDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ workspace?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const resolvedParams = await params
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const workspaceId = resolvedSearchParams.workspace
  if (!workspaceId) {
    redirect('/pain-radar')
  }

  // Validate workspace access
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id,
      },
    },
    include: {
      workspace: true,
    },
  })

  if (!membership) {
    redirect('/pain-radar')
  }

  const workspace = membership.workspace

  // Get pain details
  const pain = await db.extractedPain.findUnique({
    where: { id: resolvedParams.id },
    include: {
      post: {
        include: {
          keyword: {
            select: {
              keyword: true,
              category: true,
            },
          },
        },
      },
    },
  })

  if (!pain || pain.workspaceId !== workspaceId) {
    notFound()
  }

  // Get linked projects
  const linkedProjects = pain.linkedProjectIds.length > 0
    ? await db.project.findMany({
        where: {
          id: { in: pain.linkedProjectIds },
          workspaceId,
        },
        select: {
          id: true,
          name: true,
          pain: true,
          status: true,
        },
      })
    : []

  // Get similar pains
  const similarPains = await db.extractedPain.findMany({
    where: {
      workspaceId,
      id: { not: pain.id },
      category: pain.category,
      painText: {
        contains: pain.painText.substring(0, 30),
        mode: 'insensitive',
      },
    },
    take: 5,
    include: {
      post: {
        select: {
          author: true,
          url: true,
          platform: true,
        },
      },
    },
  })

  return (
    <PainDetailClient
      pain={pain}
      linkedProjects={linkedProjects}
      similarPains={similarPains}
      workspaceId={workspaceId}
      user={user}
      workspace={workspace}
    />
  )
}
