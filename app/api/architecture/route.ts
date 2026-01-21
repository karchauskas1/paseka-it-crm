import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, title, description, solution, hypotheses, constraints, techStack, risks } =
      await req.json()

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'projectId and title are required' },
        { status: 400 }
      )
    }

    // Get the latest version number for this project
    const latestVersion = await db.architectureVersion.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    })

    const newVersion = (latestVersion?.version || 0) + 1

    const architectureVersion = await db.architectureVersion.create({
      data: {
        projectId,
        version: newVersion,
        title,
        description,
        solution,
        hypotheses,
        constraints,
        techStack,
        risks,
      },
    })

    return NextResponse.json(architectureVersion)
  } catch (error) {
    console.error('Error creating architecture version:', error)
    return NextResponse.json(
      { error: 'Failed to create architecture version' },
      { status: 500 }
    )
  }
}
