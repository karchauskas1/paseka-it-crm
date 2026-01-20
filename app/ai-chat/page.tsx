import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import AIChatClient from './ai-chat-client'

export default async function AIChatPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const workspaceMember = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  })

  if (!workspaceMember) {
    redirect('/onboarding')
  }

  return (
    <AIChatClient
      user={user}
      workspace={workspaceMember.workspace}
    />
  )
}
