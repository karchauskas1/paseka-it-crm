import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logCreate } from '@/lib/activity-logger'
import { notifyClientCreated } from '@/lib/telegram-group-notify'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const clients = await db.client.findMany({
      where: { workspaceId },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Добавить fallback для socialLinks и customFields (для обратной совместимости)
    const clientsWithDefaults = clients.map(client => ({
      ...client,
      socialLinks: client.socialLinks || [],
      customFields: client.customFields || {},
    }))

    return NextResponse.json({ clients: clientsWithDefaults })
  } catch (error) {
    console.error('Get clients error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, name, company, email, phone, website, source, notes, socialLinks, customFields } = body

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: 'workspaceId and name are required' },
        { status: 400 }
      )
    }

    const client = await db.client.create({
      data: {
        workspaceId,
        name,
        company,
        email,
        phone,
        website,
        source,
        notes,
        socialLinks: socialLinks || [],
        customFields: customFields || {},
        createdById: user.id,
      },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    })

    // Log activity
    await logCreate('client', client.id, { name, company, email }, user.id, { workspaceId })

    // Notify team members about new client
    const teamMembers = await db.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    })

    const userName = user.name || user.email
    await Promise.all(
      teamMembers
        .filter(m => m.userId !== user.id)
        .map(member =>
          db.notification.create({
            data: {
              userId: member.userId,
              type: 'PROJECT_STATUS_CHANGED', // Используем существующий тип
              title: 'Добавлен новый клиент',
              message: `${userName} добавил клиента "${name}"${company ? ` (${company})` : ''}`,
              entityType: 'client',
              entityId: client.id,
            },
          })
        )
    )

    // Send Telegram group notification
    notifyClientCreated(
      workspaceId,
      client.id,
      name,
      userName || 'Пользователь',
      company
    ).catch(err => console.error('Telegram group notify error:', err))

    return NextResponse.json(client)
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
