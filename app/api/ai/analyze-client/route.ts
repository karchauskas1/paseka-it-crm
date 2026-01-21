import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { analyzeClient } from '@/lib/ai'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId } = body

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    // Get client data with projects
    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        projects: {
          select: { id: true, status: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const clientData = {
      name: client.name,
      company: client.company || undefined,
      source: client.source || 'Не указан',
      status: client.status,
      notes: client.notes || undefined,
      projectsCount: client.projects.length,
      activeProjectsCount: client.projects.filter(p => p.status === 'IN_PROGRESS').length,
      completedProjectsCount: client.projects.filter(p => p.status === 'COMPLETED').length,
    }

    const analysis = await analyzeClient(clientData)

    // Save analysis to client with author info
    const analysisData = {
      text: analysis,
      generatedBy: user.id,
      generatedByName: user.name || user.email,
      generatedAt: new Date().toISOString(),
    }

    await db.client.update({
      where: { id: clientId },
      data: {
        aiAnalysis: analysisData,
        aiAnalyzedAt: new Date(),
      },
    })

    return NextResponse.json({
      analysis,
      generatedBy: user.name || user.email,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Client analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to analyze client' },
      { status: 500 }
    )
  }
}
