import { redirect } from 'next/navigation'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'
import NotificationsClient from './notifications-client'
import { db } from '@/lib/db'

export default async function NotificationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) redirect('/login')

  // Get all notifications for user
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100, // Limit to last 100 notifications
  })

  return (
    <NotificationsClient
      user={user}
      workspace={workspace}
      initialNotifications={notifications}
    />
  )
}
