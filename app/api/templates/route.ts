import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

/**
 * GET /api/templates
 * Получить список шаблонов проектов
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const templates = await db.project.findMany({
      where: {
        workspaceId: workspace.id,
        isTemplate: true,
      },
      include: {
        tasks: {
          select: { id: true, title: true },
        },
        milestones: {
          select: { id: true, title: true },
        },
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/templates
 * Создать шаблон из существующего проекта
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getUserWorkspace(user.id)
    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const { projectId, templateName } = await req.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Get the source project
    const sourceProject = await db.project.findFirst({
      where: { id: projectId, workspaceId: workspace.id },
      include: {
        tasks: {
          select: {
            title: true,
            description: true,
            status: true,
            priority: true,
            subtasks: {
              select: { title: true },
            },
          },
        },
        milestones: {
          select: {
            title: true,
            description: true,
            status: true,
          },
        },
        architectureVersions: {
          select: {
            title: true,
            description: true,
            solution: true,
            hypotheses: true,
            constraints: true,
          },
        },
      },
    })

    if (!sourceProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create template (copy project without client, dates, assignees)
    const template = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name: templateName || `Шаблон: ${sourceProject.name}`,
        description: sourceProject.description,
        type: sourceProject.type,
        priority: sourceProject.priority,
        status: 'LEAD',
        isTemplate: true,
        templateName: templateName || sourceProject.name,
        createdById: user.id,
        // Copy text fields
        pain: sourceProject.pain,
        context: sourceProject.context,
        whyProblem: sourceProject.whyProblem,
        consequences: sourceProject.consequences,
        goals: sourceProject.goals,
        expectedResult: sourceProject.expectedResult,
        successCriteria: sourceProject.successCriteria,
        keyDecision: sourceProject.keyDecision,
        decisionReason: sourceProject.decisionReason,
      },
    })

    // Create tasks separately
    await Promise.all(
      sourceProject.tasks.map((task) =>
        db.task.create({
          data: {
            workspaceId: workspace.id,
            projectId: template.id,
            title: task.title,
            description: task.description,
            status: 'TODO',
            priority: task.priority,
            createdById: user.id,
          },
        })
      )
    )

    // Create milestones separately
    await Promise.all(
      sourceProject.milestones.map((m) =>
        db.milestone.create({
          data: {
            projectId: template.id,
            title: m.title,
            description: m.description,
            status: 'PENDING',
          },
        })
      )
    )

    // Create architecture versions separately
    await Promise.all(
      sourceProject.architectureVersions.map((v, i) =>
        db.architectureVersion.create({
          data: {
            projectId: template.id,
            version: i + 1,
            title: v.title,
            description: v.description,
            solution: v.solution,
            hypotheses: v.hypotheses,
            constraints: v.constraints,
          },
        })
      )
    )

    // Get final template with counts
    const templateWithCounts = await db.project.findUnique({
      where: { id: template.id },
      include: {
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
      },
    })

    return NextResponse.json(templateWithCounts, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
