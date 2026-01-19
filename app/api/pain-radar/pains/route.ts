import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'
import { painFilterSchema } from '@/lib/validations/pain-radar'
import type { PainCategory, PainSeverity } from '@prisma/client'

// GET /api/pain-radar/pains - Get list of extracted pains with filters
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse and validate filters - convert null to undefined for Zod
    const filters = {
      category: searchParams.get('category') || undefined,
      severity: searchParams.get('severity') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    }

    const validatedFilters = painFilterSchema.parse(filters)
    const search = searchParams.get('search')

    // Build where clause
    const where: any = {
      workspaceId,
    }

    if (validatedFilters.category) {
      where.category = validatedFilters.category
    }

    if (validatedFilters.severity) {
      where.severity = validatedFilters.severity
    }

    if (validatedFilters.dateFrom || validatedFilters.dateTo) {
      where.createdAt = {}
      if (validatedFilters.dateFrom) {
        where.createdAt.gte = new Date(validatedFilters.dateFrom)
      }
      if (validatedFilters.dateTo) {
        where.createdAt.lte = new Date(validatedFilters.dateTo)
      }
    }

    if (search) {
      where.OR = [
        { painText: { contains: search, mode: 'insensitive' } },
        { keywords: { has: search } },
      ]
    }

    // Determine sort order
    const orderBy: any = {}
    if (validatedFilters.sortBy === 'frequency') {
      orderBy.frequency = 'desc'
    } else if (validatedFilters.sortBy === 'trend') {
      orderBy.trend = 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    // Get pains with pagination
    const [pains, total] = await Promise.all([
      db.extractedPain.findMany({
        where,
        include: {
          post: {
            select: {
              id: true,
              author: true,
              url: true,
              platform: true,
              publishedAt: true,
            },
          },
        },
        orderBy,
        take: Math.min(validatedFilters.limit, 100),
        skip: validatedFilters.offset,
      }),
      db.extractedPain.count({ where }),
    ])

    // Get aggregations
    const [categoryAggregation, severityAggregation] = await Promise.all([
      db.extractedPain.groupBy({
        by: ['category'],
        _count: true,
        where: { workspaceId },
      }),
      db.extractedPain.groupBy({
        by: ['severity'],
        _count: true,
        where: { workspaceId },
      }),
    ])

    const aggregations = {
      byCategory: Object.fromEntries(
        categoryAggregation.map(item => [item.category, item._count])
      ),
      bySeverity: Object.fromEntries(
        severityAggregation.map(item => [item.severity, item._count])
      ),
    }

    return NextResponse.json({
      pains,
      total,
      limit: validatedFilters.limit,
      offset: validatedFilters.offset,
      aggregations,
    })
  } catch (error: any) {
    console.error('Get pains error:', error)

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
