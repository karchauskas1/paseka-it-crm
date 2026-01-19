import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'
import { z } from 'zod'
import type { PainCategory, PainSeverity } from '@prisma/client'

// GET /api/pain-radar/pains/[id] - Get pain details
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

    const pain = await db.extractedPain.findUnique({
      where: { id: id },
      include: {
        post: {
          include: {
            keyword: {
              select: {
                keyword: true,
                category: true,
              },
            },
          },
        },
      },
    })

    if (!pain) {
      return NextResponse.json({ error: 'Pain not found' }, { status: 404 })
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, pain.workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get linked projects if any
    let linkedProjects: Array<{
      id: string
      name: string
      pain: string | null
      status: string
    }> = []
    if (pain.linkedProjectIds.length > 0) {
      linkedProjects = await db.project.findMany({
        where: {
          id: { in: pain.linkedProjectIds },
          workspaceId: pain.workspaceId,
        },
        select: {
          id: true,
          name: true,
          pain: true,
          status: true,
        },
      })
    }

    // Find similar pains (simple text matching for MVP)
    const similarPains = await db.extractedPain.findMany({
      where: {
        workspaceId: pain.workspaceId,
        id: { not: pain.id },
        category: pain.category,
        painText: {
          contains: pain.painText.substring(0, 30),
          mode: 'insensitive',
        },
      },
      take: 5,
      include: {
        post: {
          select: {
            author: true,
            url: true,
          },
        },
      },
    })

    return NextResponse.json({
      pain,
      linkedProjects,
      similarPains,
    })
  } catch (error) {
    console.error('Get pain error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/pain-radar/pains/[id] - Update pain
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

    const pain = await db.extractedPain.findUnique({
      where: { id: id },
    })

    if (!pain) {
      return NextResponse.json({ error: 'Pain not found' }, { status: 404 })
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, pain.workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate update data
    const updateSchema = z.object({
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
      category: z.enum([
        'TIME_MANAGEMENT',
        'COST',
        'TECHNICAL',
        'PROCESS',
        'COMMUNICATION',
        'QUALITY',
        'SCALABILITY',
        'SECURITY',
        'OTHER',
      ]).optional(),
      linkedProjectIds: z.array(z.string().uuid()).optional(),
      aiInsights: z.any().optional(),
    })

    const validatedData = updateSchema.parse(body)

    // Update pain
    const updatedPain = await db.extractedPain.update({
      where: { id: id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
    })

    // Log activity
    await db.activity.create({
      data: {
        workspaceId: pain.workspaceId,
        userId: user.id,
        type: 'UPDATE',
        action: 'pain_radar.update_pain',
        entityType: 'extracted_pain',
        entityId: id,
        newValue: {
          updates: validatedData,
        },
      },
    })

    return NextResponse.json({ pain: updatedPain })
  } catch (error: any) {
    console.error('Update pain error:', error)

    if (error.name === 'ZodError') {
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
