import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
    }

    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const keywords = await db.painKeyword.findMany({
      where: { workspaceId },
      include: {
        createdBy: { select: { name: true, email: true } },
        _count: { select: { posts: true, scans: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ keywords })
  } catch (error: any) {
    console.error('Keywords GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, keyword, category } = body

    if (!workspaceId || !keyword) {
      return NextResponse.json(
        { error: 'Workspace ID and keyword required' },
        { status: 400 }
      )
    }

    if (keyword.length < 2 || keyword.length > 100) {
      return NextResponse.json(
        { error: 'Keyword must be 2-100 characters' },
        { status: 400 }
      )
    }

    const member = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newKeyword = await db.painKeyword.create({
      data: {
        workspaceId,
        keyword: keyword.trim(),
        category: category?.trim(),
        createdById: user.id,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    })

    await db.activity.create({
      data: {
        workspaceId,
        type: 'CREATE',
        entityType: 'pain_keyword',
        entityId: newKeyword.id,
        action: 'Created keyword: ' + newKeyword.keyword,
        userId: user.id,
      },
    })

    return NextResponse.json({ keyword: newKeyword })
  } catch (error: any) {
    console.error('Keywords POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
