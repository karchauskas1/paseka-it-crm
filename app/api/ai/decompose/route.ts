import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getUserWorkspace } from '@/lib/auth'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

/**
 * POST /api/ai/decompose
 * Декомпозиция задачи на подзадачи с помощью AI
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

    const { taskId, taskTitle, taskDescription, projectContext } = await req.json()

    if (!taskTitle) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({ apiKey })

    const systemPrompt = `Ты эксперт по управлению проектами в консалтинговой компании.
Твоя задача - декомпозировать задачу на конкретные, измеримые подзадачи.

Правила:
1. Создай от 3 до 7 подзадач
2. Каждая подзадача должна быть конкретной и выполнимой за 1-4 часа
3. Подзадачи должны быть в логическом порядке
4. Используй глаголы в повелительном наклонении (например: "Создать...", "Проверить...", "Согласовать...")
5. Возвращай только JSON массив строк без markdown

Пример ответа:
["Подзадача 1", "Подзадача 2", "Подзадача 3"]`

    const userPrompt = `Декомпозируй следующую задачу на подзадачи:

Задача: ${taskTitle}
${taskDescription ? `Описание: ${taskDescription}` : ''}
${projectContext ? `Контекст проекта: ${projectContext}` : ''}

Верни JSON массив подзадач.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // Extract text from response
    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response')
    }

    // Parse JSON from response
    let subtasks: string[]
    try {
      // Try to extract JSON array from the response
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found')
      }
      subtasks = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Save decomposition to task if taskId provided
    if (taskId) {
      const task = await db.task.findFirst({
        where: { id: taskId, workspaceId: workspace.id },
      })

      if (task) {
        // Save AI decomposition to task
        await db.task.update({
          where: { id: taskId },
          data: {
            aiDecomposition: {
              subtasks: subtasks.map((title) => ({ title, completed: false })),
              generatedAt: new Date().toISOString(),
            },
            aiDecomposedAt: new Date(),
          },
        })

        return NextResponse.json({
          subtasks: subtasks.map((title) => ({ title, completed: false })),
          created: false,
          saved: true,
        })
      }
    }

    return NextResponse.json({ subtasks, created: false, saved: false })
  } catch (error) {
    console.error('Error in AI decompose:', error)
    return NextResponse.json(
      { error: 'Failed to decompose task' },
      { status: 500 }
    )
  }
}
