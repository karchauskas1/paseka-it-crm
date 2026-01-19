import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/events
 * Получить события за период
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    const workspaceId = workspaceMember.workspaceId

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const type = searchParams.get('type')

    const where: any = {
      workspaceId,
    }

    if (from || to) {
      where.startDate = {}
      if (from) {
        where.startDate.gte = new Date(from)
      }
      if (to) {
        where.startDate.lte = new Date(to)
      }
    }

    if (type) {
      where.type = type
    }

    const events = await db.event.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/events
 * Создать событие
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceMember = await db.workspaceMember.findFirst({
      where: { userId: user.id },
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 })
    }

    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      type,
      projectId,
      taskId,
      clientId,
    } = await req.json()

    if (!title || !startDate || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startDate, type' },
        { status: 400 }
      )
    }

    const event = await db.event.create({
      data: {
        workspaceId: workspaceMember.workspaceId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay || false,
        type,
        projectId,
        taskId,
        clientId,
        createdById: user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
