import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import TouchesClient from './touches-client'

export const metadata = {
  title: 'Касания | PASEKA IT CRM',
  description: 'Отслеживание контактов и касаний',
}

export default async function TouchesPage() {
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

  return (
    <TouchesClient
      user={user}
      workspace={workspaceMember.workspace}
      userRole={workspaceMember.role}
    />
  )
}
