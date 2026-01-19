import { redirect } from 'next/navigation'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) redirect('/login')

  return <ProfileClient user={user} workspace={workspace} />
}
