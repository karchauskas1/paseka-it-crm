import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'

/**
 * POST /api/projects/from-template
 * Создать проект из шаблона
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

    const { templateId, name, clientId, startDate, endDatePlan, budget } = await req.json()

    if (!templateId || !name) {
      return NextResponse.json(
        { error: 'Template ID and name are required' },
        { status: 400 }
      )
    }

    // Get the template
    const template = await db.project.findFirst({
      where: {
        id: templateId,
        workspaceId: workspace.id,
        isTemplate: true,
      },
      include: {
        tasks: {
          include: {
            subtasks: true,
          },
        },
        milestones: true,
        architectureVersions: true,
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Verify client belongs to workspace if provided
    if (clientId) {
      const client = await db.client.findFirst({
        where: { id: clientId, workspaceId: workspace.id },
      })
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    // Create new project from template
    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name,
        description: template.description,
        type: template.type,
        priority: template.priority,
        status: 'LEAD',
        isTemplate: false,
        clientId: clientId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDatePlan: endDatePlan ? new Date(endDatePlan) : null,
        budget: budget || null,
        createdById: user.id,
        // Copy text fields
        pain: template.pain,
        context: template.context,
        whyProblem: template.whyProblem,
        consequences: template.consequences,
        goals: template.goals,
        expectedResult: template.expectedResult,
        successCriteria: template.successCriteria,
        keyDecision: template.keyDecision,
        decisionReason: template.decisionReason,
      },
    })

    // Create tasks separately
    await Promise.all(
      template.tasks.map((task) =>
        db.task.create({
          data: {
            workspaceId: workspace.id,
            projectId: project.id,
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
      template.milestones.map((m) =>
        db.milestone.create({
          data: {
            projectId: project.id,
            title: m.title,
            description: m.description,
            status: 'PENDING',
          },
        })
      )
    )

    // Create architecture versions separately
    await Promise.all(
      template.architectureVersions.map((v, i) =>
        db.architectureVersion.create({
          data: {
            projectId: project.id,
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

    // Get final project with counts
    const projectWithCounts = await db.project.findUnique({
      where: { id: project.id },
      include: {
        client: {
          select: { name: true },
        },
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
      },
    })

    return NextResponse.json(projectWithCounts, { status: 201 })
  } catch (error) {
    console.error('Error creating project from template:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
