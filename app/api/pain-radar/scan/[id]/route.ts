import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'

// GET /api/pain-radar/scan/[id] - Get scan status and results
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scan = await db.painScan.findUnique({
      where: { id: id },
      include: {
        keyword: {
          select: {
            id: true,
            keyword: true,
            category: true,
          },
        },
      },
    })

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, scan.workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If scan is completed, include posts
    let posts = null
    if (scan.status === 'COMPLETED') {
      posts = await db.socialPost.findMany({
        where: { keywordId: scan.keywordId },
        orderBy: { publishedAt: 'desc' },
        take: 100,
      })
    }

    return NextResponse.json({
      scan,
      posts,
    })
  } catch (error) {
    console.error('Get scan error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
