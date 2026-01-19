import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import FeedbackClient from './feedback-client'

export default async function FeedbackPage() {
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

  const feedback = await db.feedback.findMany({
    where: {
      workspaceId: workspaceMember.workspaceId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <FeedbackClient
      user={user}
      workspace={{ ...workspaceMember.workspace, role: workspaceMember.role }}
      feedback={feedback}
    />
  )
}
