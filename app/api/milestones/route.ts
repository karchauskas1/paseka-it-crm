import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, title, description, dueDate, order } = await req.json()

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'projectId and title are required' },
        { status: 400 }
      )
    }

    // Get the max order for this project if not provided
    let milestoneOrder = order
    if (milestoneOrder === undefined) {
      const lastMilestone = await db.milestone.findFirst({
        where: { projectId },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      milestoneOrder = (lastMilestone?.order || 0) + 1
    }

    const milestone = await db.milestone.create({
      data: {
        projectId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        order: milestoneOrder,
        status: 'PENDING',
      },
    })

    return NextResponse.json(milestone)
  } catch (error) {
    console.error('Error creating milestone:', error)
    return NextResponse.json(
      { error: 'Failed to create milestone' },
      { status: 500 }
    )
  }
}
