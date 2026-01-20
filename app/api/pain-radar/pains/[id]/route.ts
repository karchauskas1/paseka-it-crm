import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params

    const pain = await db.extractedPain.findUnique({
      where: { id: params.id },
      include: {
        post: {
          select: {
            url: true,
            author: true,
            content: true,
            platform: true,
            publishedAt: true,
            likes: true,
            comments: true,
          },
        },
      },
    })

    if (!pain) {
      return NextResponse.json({ error: 'Pain not found' }, { status: 404 })
    }

    const member = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: pain.workspaceId,
          userId: user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ pain })
  } catch (error: any) {
    console.error('Pain GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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
    const { severity, category, linkedProjectIds } = body

    const pain = await db.extractedPain.findUnique({
      where: { id: params.id },
    })

    if (!pain) {
      return NextResponse.json({ error: 'Pain not found' }, { status: 404 })
    }

    const member = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: pain.workspaceId,
          userId: user.id,
        },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await db.extractedPain.update({
      where: { id: params.id },
      data: {
        ...(severity && { severity }),
        ...(category && { category }),
        ...(linkedProjectIds && { linkedProjectIds }),
      },
    })

    return NextResponse.json({ pain: updated })
  } catch (error: any) {
    console.error('Pain PATCH error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
