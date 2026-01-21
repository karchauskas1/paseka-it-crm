import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateSuggestions, analyzePain, generateArchitectureSuggestions } from '@/lib/ai'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, projectId, context } = body

    if (type === 'field') {
      const suggestions = await generateSuggestions({
        entityType: context.entityType,
        fieldType: context.fieldType,
        currentValue: context.currentValue,
        relatedEntities: context.relatedEntities || [],
      })

      // Save suggestions to database
      if (projectId) {
        await db.aISuggestion.create({
          data: {
            projectId,
            fieldType: context.fieldType,
            fieldId: context.fieldId || 'unknown',
            context: context,
            suggestions: suggestions,
            userId: user.id,
          },
        })
      }

      return NextResponse.json({ suggestions })
    }

    if (type === 'pain-analysis') {
      try {
        const analysis = await analyzePain(context.painDescription, context)
        if (!analysis) {
          return NextResponse.json(
            { error: 'AI returned empty response' },
            { status: 500 }
          )
        }

        // Save pain analysis to project
        if (projectId) {
          await db.project.update({
            where: { id: projectId },
            data: {
              aiPainAnalysis: analysis,
              aiPainAnalyzedAt: new Date(),
            },
          })
        }

        return NextResponse.json({ analysis })
      } catch (aiError: any) {
        console.error('AI analysis failed:', aiError)
        return NextResponse.json(
          { error: aiError.message || 'AI analysis failed' },
          { status: 500 }
        )
      }
    }

    if (type === 'architecture') {
      const architecture = await generateArchitectureSuggestions(
        context.pain,
        context.goals,
        context
      )

      // Save architecture to project
      if (projectId) {
        await db.project.update({
          where: { id: projectId },
          data: {
            aiArchitecture: architecture,
            aiArchitectureAt: new Date(),
          },
        })
      }

      return NextResponse.json({ architecture })
    }

    return NextResponse.json(
      { error: 'Invalid suggestion type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('AI suggestions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
