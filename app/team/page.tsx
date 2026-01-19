import { redirect } from 'next/navigation'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'
import { db } from '@/lib/db'
import TeamClient from './team-client'

export default async function TeamPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const workspace = await getUserWorkspace(user.id)
  if (!workspace) redirect('/login')

  // Get team members with their stats
  const members = await db.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
  })

  // Get task stats for each member
  const memberIds = members.map((m) => m.userId)
  const taskStats = await db.task.groupBy({
    by: ['assigneeId', 'status'],
    where: {
      workspaceId: workspace.id,
      assigneeId: { in: memberIds },
    },
    _count: true,
  })

  // Process stats
  const statsMap = new Map<string, { total: number; completed: number; inProgress: number }>()
  for (const stat of taskStats) {
    if (!stat.assigneeId) continue
    const existing = statsMap.get(stat.assigneeId) || { total: 0, completed: 0, inProgress: 0 }
    existing.total += stat._count
    if (stat.status === 'COMPLETED') {
      existing.completed += stat._count
    } else if (stat.status === 'IN_PROGRESS') {
      existing.inProgress += stat._count
    }
    statsMap.set(stat.assigneeId, existing)
  }

  const teamData = members.map((m) => ({
    ...m.user,
    createdAt: m.user.createdAt.toISOString(),
    workspaceRole: m.role,
    stats: statsMap.get(m.userId) || { total: 0, completed: 0, inProgress: 0 },
  }))

  return (
    <TeamClient
      user={user}
      workspace={workspace}
      members={teamData}
    />
  )
}
