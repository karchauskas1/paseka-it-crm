import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { PainRadarClient } from './pain-radar-client'

export const metadata: Metadata = {
  title: 'Pain Radar | PASEKA CRM',
  description: 'Анализ болей бизнеса через мониторинг социальных сетей',
}

export default async function PainRadarPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const workspaceId = resolvedSearchParams.workspace

  if (!workspaceId) {
    // Get first workspace
    const firstMembership = await db.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    })

    if (!firstMembership) {
      redirect('/onboarding')
    }

    redirect(`/pain-radar?workspace=${firstMembership.workspaceId}`)
  }

  // Validate workspace access
  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id,
      },
    },
  })

  if (!membership) {
    redirect('/pain-radar')
  }

  // Get initial data
  const [keywords, recentPains] = await Promise.all([
    db.painKeyword.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            posts: true,
            scans: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.extractedPain.findMany({
      where: { workspaceId },
      include: {
        post: {
          select: {
            author: true,
            url: true,
            platform: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <PainRadarClient
      workspaceId={workspaceId}
      initialKeywords={keywords}
      initialPains={recentPains}
    />
  )
}
