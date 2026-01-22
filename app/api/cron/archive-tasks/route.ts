import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// This endpoint should be called by a cron job every hour
// It archives tasks that have been COMPLETED for more than 12 hours

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security (optional - add CRON_SECRET to env)
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate 12 hours ago
    const twelveHoursAgo = new Date()
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12)

    // Find and archive tasks that:
    // 1. Have status COMPLETED
    // 2. Were completed more than 12 hours ago
    // 3. Are not already archived
    const tasksToArchive = await db.task.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          lte: twelveHoursAgo,
        },
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
        completedAt: true,
      },
    })

    if (tasksToArchive.length === 0) {
      return NextResponse.json({
        message: 'No tasks to archive',
        archivedCount: 0,
      })
    }

    // Archive all found tasks
    const result = await db.task.updateMany({
      where: {
        id: {
          in: tasksToArchive.map(t => t.id),
        },
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    })

    console.log(`Auto-archived ${result.count} tasks`)

    return NextResponse.json({
      message: `Archived ${result.count} tasks`,
      archivedCount: result.count,
      tasks: tasksToArchive.map(t => ({ id: t.id, title: t.title })),
    })
  } catch (error) {
    console.error('Error in auto-archive cron:', error)
    return NextResponse.json(
      { error: 'Failed to archive tasks' },
      { status: 500 }
    )
  }
}

// Also allow POST for flexibility with different cron services
export async function POST(req: NextRequest) {
  return GET(req)
}
