import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const body = await request.json()
    const { keyword, category, isActive } = body

    const existingKeyword = await db.painKeyword.findUnique({
      where: { id: params.id },
    })

    if (!existingKeyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    const member = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: existingKeyword.workspaceId,
          userId: user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await db.painKeyword.update({
      where: { id: params.id },
      data: {
        ...(keyword !== undefined && { keyword: keyword.trim() }),
        ...(category !== undefined && { category: category?.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    })

    await db.activity.create({
      data: {
        workspaceId: existingKeyword.workspaceId,
        type: 'UPDATE',
        entityType: 'pain_keyword',
        entityId: params.id,
        action: 'Updated keyword: ' + updated.keyword,
        userId: user.id,
      },
    })

    return NextResponse.json({ keyword: updated })
  } catch (error: any) {
    console.error('Keywords PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params

    const keyword = await db.painKeyword.findUnique({
      where: { id: params.id },
    })

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 })
    }

    const member = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: keyword.workspaceId,
          userId: user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.painKeyword.delete({
      where: { id: params.id },
    })

    await db.activity.create({
      data: {
        workspaceId: keyword.workspaceId,
        type: 'DELETE',
        entityType: 'pain_keyword',
        entityId: params.id,
        action: 'Deleted keyword: ' + keyword.keyword,
        userId: user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Keywords DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
