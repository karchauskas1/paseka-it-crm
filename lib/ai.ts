import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

export interface AIContext {
  entityType: string
  fieldType: string
  currentValue: string
  relatedEntities?: any[]
  projectContext?: any
}

export async function generateSuggestions(context: AIContext): Promise<string[]> {
  try {
    const prompt = buildPrompt(context)

    const response = await client.messages.create({
      model: 'anthropic/claude-opus-4-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return parseSuggestions(content.text)
    }

    return []
  } catch (error) {
    console.error('AI Suggestions Error:', error)
    return []
  }
}

export async function analyzePain(painDescription: string, context?: any): Promise<string> {
  try {
    const prompt = `
Ты - эксперт по бизнес-анализу и архитектуре решений.

Описание боли клиента:
"${painDescription}"

Проанализируй эту боль и предложи:
1. Основные причины проблемы
2. Потенциальные последствия, если проблема не будет решена
3. Возможные направления решения (2-3 варианта)

Будь конкретным и практичным. Ответ дай структурированно.
    `

    const response = await client.messages.create({
      model: 'anthropic/claude-opus-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text
    }

    return ''
  } catch (error) {
    console.error('Pain Analysis Error:', error)
    return ''
  }
}

export async function generateArchitectureSuggestions(
  pain: string,
  goals: string,
  context?: any
): Promise<string> {
  try {
    const prompt = `
Ты - опытный архитектор решений и технический консультант.

Боль клиента:
${pain}

Цели проекта:
${goals}

Предложи архитектуру решения, включающую:
1. Общий подход к решению проблемы
2. Ключевые компоненты системы
3. Технологический стек (если применимо)
4. Потенциальные риски и ограничения
5. Альтернативные варианты решения

Будь конкретным и практичным.
    `

    const response = await client.messages.create({
      model: 'anthropic/claude-opus-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text
    }

    return ''
  } catch (error) {
    console.error('Architecture Generation Error:', error)
    return ''
  }
}

export async function generateProjectInsights(projectData: any): Promise<any> {
  try {
    const prompt = `
Проанализируй данные проекта и дай краткие инсайты:

Проект: ${projectData.name}
Статус: ${projectData.status}
Тип: ${projectData.type}
Бюджет: ${projectData.budget}
Количество задач: ${projectData.tasksCount}
Выполнено задач: ${projectData.completedTasksCount}

Дай:
1. Оценку прогресса проекта (1-2 предложения)
2. Потенциальные риски (если есть)
3. Рекомендации для следующих шагов

Будь кратким и конкретным.
    `

    const response = await client.messages.create({
      model: 'anthropic/claude-opus-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return {
        analysis: content.text,
        timestamp: new Date().toISOString(),
      }
    }

    return null
  } catch (error) {
    console.error('Project Insights Error:', error)
    return null
  }
}

function buildPrompt(context: AIContext): string {
  let prompt = `
Ты - помощник CRM системы. Помоги пользователю заполнить поле.

Тип сущности: ${context.entityType}
Тип поля: ${context.fieldType}
Текущее значение: "${context.currentValue}"
`

  if (context.relatedEntities && context.relatedEntities.length > 0) {
    prompt += `\n\nПохожие записи:\n`
    context.relatedEntities.slice(0, 5).forEach((entity) => {
      prompt += `- ${entity.name}\n`
    })
  }

  prompt += `\n\nПредложи 3-5 вариантов для заполнения этого поля. Каждый вариант начинай с тире (-).`

  return prompt
}

function parseSuggestions(text: string): string[] {
  return text
    .split('\n')
    .filter((line) => line.trim().startsWith('-'))
    .map((line) => line.replace(/^-\s*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 5)
}

export async function generateFeedbackQuestions(projectData: any): Promise<string[]> {
  try {
    const prompt = `
На основе завершённого проекта создай 5-7 вопросов для сбора обратной связи от клиента.

Проект: ${projectData.name}
Тип проекта: ${projectData.type}
Описание: ${projectData.description}

Вопросы должны быть:
- Конкретными и релевантными проекту
- Помогающими понять удовлетворённость клиента
- Направленными на улучшение процессов

Каждый вопрос начинай с тире (-).
    `

    const response = await client.messages.create({
      model: 'anthropic/claude-opus-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return parseSuggestions(content.text)
    }

    return []
  } catch (error) {
    console.error('Feedback Questions Error:', error)
    return []
  }
}
