import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'
import { checkPermission } from '@/lib/permissions'
import { randomBytes } from 'crypto'

/**
 * GET /api/invites
 * Получить список инвайтов workspace
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Проверка прав
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
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
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}

/**
 * POST /api/invites
 * Создать новый инвайт
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Проверка прав
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { email, role = 'MEMBER' } = body

    // Валидация роли - нельзя создавать инвайт на OWNER
    if (role === 'OWNER') {
      return NextResponse.json(
        { error: 'Cannot create invite for OWNER role' },
        { status: 400 }
      )
    }

    // ADMIN не может создавать ADMIN инвайты, только OWNER
    if (role === 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only OWNER can invite ADMIN users' },
        { status: 403 }
      )
    }

    // Генерация токена
    const token = randomBytes(32).toString('hex')

    // Срок действия - 7 дней
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await db.invite.create({
      data: {
        workspaceId: workspace.id,
        email: email || null,
        token,
        role,
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
    console.error('Error creating invite:', error)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}
