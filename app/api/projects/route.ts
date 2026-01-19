import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateGuestToken } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const where: any = { workspaceId }
    if (status) where.status = status
    if (type) where.type = type

    const projects = await db.project.findMany({
      where,
      include: {
        client: true,
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Get projects error:', error)
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
    const {
      workspaceId,
      clientId,
      name,
      description,
      type,
      status,
      priority,
      budget,
      startDate,
      endDatePlan,
    } = body

    if (!workspaceId || !clientId || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const project = await db.project.create({
      data: {
        workspaceId,
        clientId,
        name,
        description,
        type,
        status: status || 'QUALIFICATION',
        priority: priority || 'MEDIUM',
        budget: budget ? parseFloat(budget) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDatePlan: endDatePlan ? new Date(endDatePlan) : null,
        guestToken: generateGuestToken(),
        createdById: user.id,
      },
      include: {
        client: true,
      },
    })

    // Create activity log
    await db.activity.create({
      data: {
        projectId: project.id,
        type: 'CREATE',
        entityType: 'project',
        entityId: project.id,
        action: 'created',
        newValue: { name: project.name },
        userId: user.id,
      },
    })

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
