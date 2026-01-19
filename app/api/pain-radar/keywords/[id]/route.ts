import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'
import { painKeywordUpdateSchema } from '@/lib/validations/pain-radar'
import { z } from 'zod'

// PATCH /api/pain-radar/keywords/[id] - Update keyword
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keyword = await db.painKeyword.findUnique({
      where: { id: id },
    })

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, keyword.workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = painKeywordUpdateSchema.parse(body)

    // Update keyword
    const updated = await db.painKeyword.update({
      where: { id: id },
      data: validatedData,
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
        workspaceId: keyword.workspaceId,
        type: 'UPDATE',
        entityType: 'pain_keyword',
        entityId: keyword.id,
        action: 'updated',
        oldValue: {
          keyword: keyword.keyword,
          category: keyword.category,
          isActive: keyword.isActive,
        },
        newValue: validatedData,
        userId: user.id,
      },
    })

    return NextResponse.json({ keyword: updated })
  } catch (error) {
    console.error('Update keyword error:', error)

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

// DELETE /api/pain-radar/keywords/[id] - Delete keyword
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keyword = await db.painKeyword.findUnique({
      where: { id: id },
    })

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, keyword.workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete keyword (cascade will delete related posts and scans)
    await db.painKeyword.delete({
      where: { id: id },
    })

    // Log activity
    await db.activity.create({
      data: {
        workspaceId: keyword.workspaceId,
        type: 'DELETE',
        entityType: 'pain_keyword',
        entityId: keyword.id,
        action: 'deleted',
        oldValue: { keyword: keyword.keyword },
        userId: user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete keyword error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
