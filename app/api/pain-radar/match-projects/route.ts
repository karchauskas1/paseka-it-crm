import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'
import { matchPainToProjects } from '@/lib/ai'
import { z } from 'zod'
import { AIAnalysisError } from '@/lib/pain-radar/errors'
import { SIMILARITY_THRESHOLD } from '@/lib/pain-radar/constants'

// POST /api/pain-radar/match-projects - Find projects with similar pains
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request
    const requestSchema = z.object({
      workspaceId: z.string().uuid('Invalid workspace ID'),
      painId: z.string().uuid('Invalid pain ID'),
    })

    const { workspaceId, painId } = requestSchema.parse(body)

    // Validate workspace access
    const hasAccess = await validateWorkspaceAccess(user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get pain
    const pain = await db.extractedPain.findUnique({
      where: { id: painId },
    })

    if (!pain) {
      return NextResponse.json({ error: 'Pain not found' }, { status: 404 })
    }

    if (pain.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Pain not in workspace' }, { status: 400 })
    }

    // Get all projects with pain field in workspace
    const projects = await db.project.findMany({
      where: {
        workspaceId,
        pain: { not: null },
      },
      select: {
        id: true,
        name: true,
        pain: true,
        status: true,
        createdAt: true,
      },
    })

    if (projects.length === 0) {
      return NextResponse.json({
        projects: [],
        message: 'No projects with pain descriptions found',
      })
    }

    // Use AI to match pain to projects
    const matches = await matchPainToProjects(
      pain.painText,
      projects.map(p => ({
        id: p.id,
        name: p.name,
        pain: p.pain || '',
      }))
    )

    // Filter by similarity threshold
    const filteredMatches = matches
      .filter(m => m.similarity >= SIMILARITY_THRESHOLD)
      .map(m => ({
        ...m,
        project: projects.find(p => p.id === m.projectId),
      }))

    // Log activity
    await db.activity.create({
      data: {
        workspaceId,
        userId: user.id,
        type: 'CREATE',
        action: 'pain_radar.match_projects',
        entityType: 'extracted_pain',
        entityId: painId,
        newValue: {
          matchesFound: filteredMatches.length,
          totalProjects: projects.length,
        },
      },
    })

    return NextResponse.json({
      projects: filteredMatches,
      totalProjects: projects.length,
      matchesFound: filteredMatches.length,
    })
  } catch (error: any) {
    console.error('Match projects error:', error)

    if (error instanceof AIAnalysisError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

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
