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
      const analysis = await analyzePain(context.painDescription, context)
      return NextResponse.json({ analysis })
    }

    if (type === 'architecture') {
      const architecture = await generateArchitectureSuggestions(
        context.pain,
        context.goals,
        context
      )
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
