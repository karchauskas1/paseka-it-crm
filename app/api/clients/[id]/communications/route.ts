import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

/**
 * GET /api/clients/[id]/communications
 * Получить историю коммуникаций с клиентом
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Verify client belongs to workspace
    const client = await db.client.findFirst({
      where: { id, workspaceId: workspace.id },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const type = searchParams.get('type')

    const where: any = { clientId: id }
    if (type) {
      where.type = type
    }

    const [communications, total] = await Promise.all([
      db.communication.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.communication.count({ where }),
    ])

    return NextResponse.json({
      communications,
      total,
      hasMore: offset + communications.length < total,
    })
  } catch (error) {
    console.error('Error fetching communications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communications' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clients/[id]/communications
 * Добавить коммуникацию с клиентом
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    // Verify client belongs to workspace
    const client = await db.client.findFirst({
      where: { id, workspaceId: workspace.id },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { type, subject, content, date } = await req.json()

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Type and content are required' },
        { status: 400 }
      )
    }

    const validTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const communication = await db.communication.create({
      data: {
        clientId: id,
        type,
        subject,
        content,
        date: date ? new Date(date) : new Date(),
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(communication, { status: 201 })
  } catch (error) {
    console.error('Error creating communication:', error)
    return NextResponse.json(
      { error: 'Failed to create communication' },
      { status: 500 }
    )
  }
}
