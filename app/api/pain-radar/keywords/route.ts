import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'
import { painKeywordSchema } from '@/lib/validations/pain-radar'
import { z } from 'zod'

// GET /api/pain-radar/keywords - Get all keywords for workspace
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

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const keywords = await db.painKeyword.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            posts: true,
            scans: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ keywords })
  } catch (error) {
    console.error('Get keywords error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/pain-radar/keywords - Create new keyword
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, ...keywordData } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate keyword data
    const validatedData = painKeywordSchema.parse(keywordData)

    // Check if keyword already exists
    const existing = await db.painKeyword.findFirst({
      where: {
        workspaceId,
        keyword: validatedData.keyword,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Keyword already exists' },
        { status: 400 }
      )
    }

    // Create keyword
    const keyword = await db.painKeyword.create({
      data: {
        workspaceId,
        keyword: validatedData.keyword,
        category: validatedData.category,
        createdById: user.id,
      },
      include: {
        _count: {
          select: {
            posts: true,
            scans: true,
          },
        },
      },
    })

    // Log activity
    await db.activity.create({
      data: {
        workspaceId,
        type: 'CREATE',
        entityType: 'pain_keyword',
        entityId: keyword.id,
        action: 'created',
        newValue: { keyword: keyword.keyword },
        userId: user.id,
      },
    })

    return NextResponse.json({ keyword }, { status: 201 })
  } catch (error) {
    console.error('Create keyword error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
