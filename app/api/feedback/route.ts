import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const feedback = await db.feedback.findMany({
      where: { workspaceId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Get feedback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { workspaceId, type, title, description, priority } = body

    if (!workspaceId || !type || !title || !description) {
      return NextResponse.json(
        { error: 'workspaceId, type, title, and description are required' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['BUG', 'FEATURE', 'IMPROVEMENT'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be BUG, FEATURE, or IMPROVEMENT' },
        { status: 400 }
      )
    }

    const feedback = await db.feedback.create({
      data: {
        workspaceId,
        type,
        title,
        description,
        priority: priority || null,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Create feedback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
