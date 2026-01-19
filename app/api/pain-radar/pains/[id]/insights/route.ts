import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, validateWorkspaceAccess } from '@/lib/auth'
import { generatePainInsights } from '@/lib/ai'
import { AIAnalysisError } from '@/lib/pain-radar/errors'

// POST /api/pain-radar/pains/[id]/insights - Generate AI insights for pain
export async function POST(
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

    // Generate insights
    const insights = await generatePainInsights(
      pain.painText,
      pain.category,
      pain.sentiment
    )

    // Update pain with insights
    const updatedPain = await db.extractedPain.update({
      where: { id: id },
      data: {
        aiInsights: insights,
        updatedAt: new Date(),
      },
    })

    // Log activity
    await db.activity.create({
      data: {
        workspaceId: pain.workspaceId,
        userId: user.id,
        type: 'UPDATE',
        action: 'pain_radar.generate_insights',
        entityType: 'extracted_pain',
        entityId: id,
        newValue: {
          insightsGenerated: true,
        },
      },
    })

    return NextResponse.json({ insights })
  } catch (error: any) {
    console.error('Generate insights error:', error)

    if (error instanceof AIAnalysisError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
