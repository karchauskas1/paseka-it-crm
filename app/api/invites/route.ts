import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requirePermission, getWorkspaceRole } from '@/lib/permissions'
import { getUserWorkspace } from '@/lib/auth'
import { WorkspaceRole } from '@prisma/client'
import { randomBytes } from 'crypto'
import { z } from 'zod'

const createInviteSchema = z.object({
  role: z.enum(['VIEWER', 'MEMBER', 'ADMIN']).default('MEMBER'),
})

/**
 * GET /api/invites
 * Получить список инвайтов workspace
 */
export async function GET() {
  try {
    const user = await requireAuth()
    const workspace = await getUserWorkspace(user.id)

    if (!workspace) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 404 }
      )
    }

    // Проверяем права manage_users
    const role = await getWorkspaceRole(user.id, workspace.id)
    if (!role || (role !== WorkspaceRole.ADMIN && role !== WorkspaceRole.OWNER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const invites = await db.invite.findMany({
      where: { workspaceId: workspace.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('Error fetching invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invites
 * Создать новый инвайт
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const workspace = await getUserWorkspace(user.id)

    if (!workspace) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 404 }
      )
    }

    // Получаем роль пользователя
    const userRole = await getWorkspaceRole(user.id, workspace.id)
    if (!userRole || (userRole !== WorkspaceRole.ADMIN && userRole !== WorkspaceRole.OWNER)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data = createInviteSchema.parse(body)

    // ADMIN не может создавать ADMIN инвайты, только OWNER
    if (data.role === 'ADMIN' && userRole !== WorkspaceRole.OWNER) {
      return NextResponse.json(
        { error: 'Only OWNER can invite ADMIN users' },
        { status: 403 }
      )
    }

    // Генерация уникального токена
    const token = randomBytes(32).toString('hex')

    // Срок действия - 7 дней
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await db.invite.create({
      data: {
        workspaceId: workspace.id,
        email: null, // Всегда null - инвайт теперь только по ссылке
        token,
        role: data.role as WorkspaceRole,
        expiresAt,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Формируем ссылку для приглашения
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

    return NextResponse.json({
      ...invite,
      inviteUrl,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}
