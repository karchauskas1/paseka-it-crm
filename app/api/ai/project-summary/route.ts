import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/ai/project-summary
 * Генерация резюме проекта для клиента/руководства
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

    const { projectId, audience = 'client' } = await req.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId: workspace.id },
      include: {
        client: { select: { name: true } },
        tasks: {
          select: {
            title: true,
            status: true,
            dueDate: true,
          },
        },
        milestones: {
          select: {
            title: true,
            status: true,
            dueDate: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({ apiKey })

    const completedTasks = project.tasks.filter((t) => t.status === 'COMPLETED').length
    const totalTasks = project.tasks.length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const audiencePrompt = audience === 'client'
      ? 'для клиента (без технических деталей, фокус на ценности и результатах)'
      : 'для руководства (с KPI, рисками и рекомендациями)'

    const systemPrompt = `Ты эксперт по подготовке отчетов и резюме проектов в консалтинговой компании.
Создай профессиональное резюме проекта ${audiencePrompt}.

Структура резюме:
1. Краткое описание (2-3 предложения)
2. Текущий статус и прогресс
3. Ключевые достижения
4. Ближайшие этапы
${audience === 'management' ? '5. Риски и рекомендации' : ''}

Используй деловой стиль, будь конкретным. Формат: markdown.`

    const projectInfo = `
Название проекта: ${project.name}
Клиент: ${project.client?.name || 'Не указан'}
Статус: ${project.status}
Тип: ${project.type}

Цели проекта:
${project.goals || 'Не указаны'}

Ожидаемый результат:
${project.expectedResult || 'Не указан'}

Прогресс задач: ${completedTasks}/${totalTasks} (${completionRate}%)

Этапы проекта:
${project.milestones.map((m) => `- ${m.title} (${m.status})`).join('\n') || 'Нет этапов'}

Задачи:
${project.tasks.slice(0, 10).map((t) => `- ${t.title} (${t.status})`).join('\n') || 'Нет задач'}

Бюджет: ${project.budget ? `${project.budget.toLocaleString('ru-RU')} руб.` : 'Не указан'}
Выручка: ${project.revenue ? `${project.revenue.toLocaleString('ru-RU')} руб.` : 'Не указана'}
`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Создай резюме проекта на основе данных:\n${projectInfo}` }],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response')
    }

    return NextResponse.json({
      summary: textContent.text,
      projectName: project.name,
      audience,
    })
  } catch (error) {
    console.error('Error in AI project summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
