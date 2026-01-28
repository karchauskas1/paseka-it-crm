import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import InviteClient from './invite-client'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params
  const user = await getCurrentUser()

  // Проверяем инвайт
  const invite = await db.invite.findUnique({
    where: { token },
    include: {
      workspace: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { name: true },
      },
    },
  })

  // Если инвайт не найден
  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="bg-card p-8 rounded-lg shadow max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Приглашение не найдено</h1>
          <p className="text-muted-foreground">Ссылка на приглашение недействительна или была удалена.</p>
        </div>
      </div>
    )
  }

  // Если инвайт уже использован
  if (invite.usedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="bg-card p-8 rounded-lg shadow max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">Приглашение уже использовано</h1>
          <p className="text-muted-foreground">Это приглашение уже было принято.</p>
        </div>
      </div>
    )
  }

  // Если инвайт истёк
  if (new Date() > invite.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="bg-card p-8 rounded-lg shadow max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">Приглашение истекло</h1>
          <p className="text-muted-foreground">Срок действия этого приглашения закончился. Запросите новое приглашение.</p>
        </div>
      </div>
    )
  }

  // Если пользователь не авторизован - перенаправляем на регистрацию/вход
  if (!user) {
    redirect(`/login?redirect=/invite/${token}`)
  }

  // Проверяем, не состоит ли уже в этом workspace
  const existingMembership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        userId: user.id,
        workspaceId: invite.workspaceId,
      },
    },
  })

  if (existingMembership) {
    redirect('/dashboard')
  }

  const roleLabels: Record<string, string> = {
    VIEWER: 'Наблюдатель',
    MEMBER: 'Участник',
    ADMIN: 'Администратор',
  }

  return (
    <InviteClient
      token={token}
      workspace={invite.workspace}
      role={invite.role}
      roleLabel={roleLabels[invite.role] || invite.role}
      invitedBy={invite.createdBy?.name || 'Неизвестно'}
      user={user}
    />
  )
}
