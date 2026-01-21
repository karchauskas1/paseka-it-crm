import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { AppLayout } from '@/components/layout'
import { ChatPage } from '@/components/chat/chat-page'

export default async function Chat() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's workspace
  const workspaceMember = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    include: {
      workspace: true,
    },
  })

  if (!workspaceMember) {
    redirect('/dashboard')
  }

  return (
    <AppLayout user={user} workspace={workspaceMember.workspace} userRole={workspaceMember.role}>
      <ChatPage user={user} />
    </AppLayout>
  )
}
