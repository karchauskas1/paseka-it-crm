// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'openai/gpt-4-turbo' // GPT-4 Turbo

// Helper function to call OpenRouter API with OpenAI format
async function callOpenRouter(messages: Array<{ role: string; content: string }>, maxTokens: number = 500) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

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
    const content = await callOpenRouter([{ role: 'user', content: prompt }], 500)
    return parseSuggestions(content)
  } catch (error) {
    console.error('AI Suggestions Error:', error)
    return []
  }
}

export async function analyzePain(painDescription: string, context?: any): Promise<string> {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured')
      throw new Error('AI API key not configured')
    }

    const prompt = `
Ты - эксперт по бизнес-анализу и архитектуре решений.

Описание боли клиента:
"${painDescription}"

${context?.whyProblem ? `Почему это проблема: ${context.whyProblem}\n` : ''}
${context?.consequences ? `Последствия: ${context.consequences}\n` : ''}

Проанализируй эту боль и предложи:
1. Основные причины проблемы
2. Потенциальные последствия, если проблема не будет решена
3. Возможные направления решения (2-3 варианта)

Будь конкретным и практичным. Ответ дай структурированно.
    `

    console.log('Sending pain analysis request to AI...')
    const content = await callOpenRouter([{ role: 'user', content: prompt }], 1000)
    console.log('AI response received')
    return content
  } catch (error: any) {
    console.error('Pain Analysis Error:', error)
    console.error('Error details:', error?.message, error?.status, error?.error)
    throw error
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

    const content = await callOpenRouter([{ role: 'user', content: prompt }], 1500)

    return content

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

    const content = await callOpenRouter([{ role: 'user', content: prompt }], 500)

    return {
      analysis: content,
      timestamp: new Date().toISOString(),
    }
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

// ==================== PAIN RADAR AI FUNCTIONS ====================

import { AIAnalysisError } from './pain-radar/errors'
import type { PainCategory, PainSeverity } from '@prisma/client'

export interface ExtractedPainData {
  painText: string
  category: PainCategory
  severity: PainSeverity
  sentiment: number
  confidence: number
  keywords: string[]
  context?: string
}

export interface PostAnalysisResult {
  postId: string
  pains: ExtractedPainData[]
}

/**
 * Extract pains from social media posts using AI
 * Processes up to 10 posts at a time
 */
export async function extractPainsFromPosts(
  posts: Array<{ id: string; content: string; author: string }>,
  context?: string
): Promise<PostAnalysisResult[]> {
  try {
    if (posts.length === 0) {
      return []
    }

    const prompt = `
Ты - эксперт по анализу болей бизнеса и потребностей клиентов.

Проанализируй следующие посты из социальных сетей и извлеки из них боли, проблемы и потребности.

Посты:
${posts.map((p, i) => `
${i + 1}. Автор: ${p.author}
Текст: "${p.content}"
`).join('\n')}

${context ? `Контекст поиска: ${context}\n` : ''}

Для КАЖДОГО поста определи:
1. Какие боли/проблемы/потребности упоминает автор (может быть несколько или ноль)
2. Категорию боли: TIME_MANAGEMENT, COST, TECHNICAL, PROCESS, COMMUNICATION, QUALITY, SCALABILITY, SECURITY, OTHER
3. Серьезность: LOW, MEDIUM, HIGH, CRITICAL
4. Sentiment (число от -1.0 до 1.0, где -1 = очень негативный, 0 = нейтральный, 1 = позитивный)
5. Уверенность в анализе (0.0 до 1.0)
6. Ключевые слова из боли (2-5 слов)
7. Краткий контекст (1 предложение)

Верни результат ТОЛЬКО в формате JSON (без дополнительного текста):
{
  "posts": [
    {
      "postIndex": 0,
      "pains": [
        {
          "painText": "краткое описание боли",
          "category": "TECHNICAL",
          "severity": "HIGH",
          "sentiment": -0.7,
          "confidence": 0.9,
          "keywords": ["bug", "crash", "error"],
          "context": "User experiencing app crashes"
        }
      ]
    }
  ]
}

Если в посте нет болей, верни пустой массив pains.
Будь точным и конкретным.
`

    const content = await callOpenRouter([{ role: 'user', content: prompt }], 300)

    

    // Parse JSON from response
    let result
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('No JSON found in AI response:', content)
        throw new Error('No JSON found in response')
      }
      result = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      throw new AIAnalysisError('Invalid AI response format')
    }

    // Validate structure
    if (!result.posts || !Array.isArray(result.posts)) {
      throw new AIAnalysisError('Invalid AI response structure')
    }

    // Map to our format
    return result.posts.map((p: any, i: number) => ({
      postId: posts[p.postIndex || i]?.id || posts[i]?.id,
      pains: (p.pains || []).map((pain: any) => ({
        painText: pain.painText || '',
        category: pain.category || 'OTHER',
        severity: pain.severity || 'MEDIUM',
        sentiment: typeof pain.sentiment === 'number' ? pain.sentiment : 0,
        confidence: typeof pain.confidence === 'number' ? pain.confidence : 0.8,
        keywords: Array.isArray(pain.keywords) ? pain.keywords : [],
        context: pain.context,
      })),
    }))
  } catch (error: any) {
    console.error('Pain extraction error:', error)
    throw new AIAnalysisError(`Failed to extract pains: ${error.message}`)
  }
}

/**
 * Match pain to existing projects using semantic search
 */
export async function matchPainToProjects(
  painText: string,
  projects: Array<{ id: string; name: string; pain: string }>
): Promise<Array<{ projectId: string; similarity: number }>> {
  try {
    if (projects.length === 0) {
      return []
    }

    const prompt = `
Сравни боль из социальных сетей с болями в проектах.

Боль из соцсетей: "${painText}"

Проекты:
${projects.map((p, i) => `${i + 1}. ${p.name}: "${p.pain}"`).join('\n')}

Для каждого проекта определи семантическое сходство (0.0 - 1.0).
Верни ТОЛЬКО те, где similarity >= 0.5.

Формат JSON (без дополнительного текста):
{
  "matches": [
    {
      "projectIndex": 0,
      "similarity": 0.85
    }
  ]
}
`

    const content = await callOpenRouter([{ role: 'user', content: prompt }], 1000)

    

    // Parse JSON
    let result
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return []
      result = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse project matching response:', content)
      return []
    }

    if (!result.matches || !Array.isArray(result.matches)) {
      return []
    }

    return result.matches
      .map((m: any) => ({
        projectId: projects[m.projectIndex]?.id,
        similarity: m.similarity,
      }))
      .filter((m: any) => m.projectId && m.similarity >= 0.5)
  } catch (error: any) {
    console.error('Project matching error:', error)
    return []
  }
}

/**
 * Generate insights for a specific pain
 */
export async function generatePainInsights(
  painText: string,
  category: PainCategory,
  sentiment: number
): Promise<{
  suggestions: string[]
  opportunities: string[]
  risks: string[]
}> {
  try {
    const prompt = `
Проанализируй следующую боль бизнеса:
"${painText}"

Категория: ${category}
Sentiment: ${sentiment}

Предложи:
1. suggestions - конкретные рекомендации по решению (3-5 пунктов)
2. opportunities - бизнес-возможности (2-3 пункта)
3. risks - потенциальные риски если не решить (2-3 пункта)

Формат JSON (без дополнительного текста):
{
  "suggestions": ["рекомендация 1", "рекомендация 2"],
  "opportunities": ["возможность 1", "возможность 2"],
  "risks": ["риск 1", "риск 2"]
}
`

    const content = await callOpenRouter([{ role: 'user', content: prompt }], 1000)

    

    // Parse JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      const result = JSON.parse(jsonMatch[0])

      return {
        suggestions: result.suggestions || [],
        opportunities: result.opportunities || [],
        risks: result.risks || [],
      }
    } catch (parseError) {
      console.error('Failed to parse insights response:', content)
      throw new AIAnalysisError('Invalid insights response format')
    }
  } catch (error: any) {
    console.error('Pain insights error:', error)
    throw new AIAnalysisError(`Failed to generate insights: ${error.message}`)
  }
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

    const content = await callOpenRouter([{ role: 'user', content: prompt }], 500)
    return parseSuggestions(content)
  } catch (error) {
    console.error('Feedback Questions Error:', error)
    return []
  }
}

/**
 * Translate Russian text to English for Reddit search
 * Detects if text is in Cyrillic and translates it
 */
export async function translateToEnglish(text: string): Promise<string> {
  try {
    // Check if text contains Cyrillic characters
    const hasCyrillic = /[а-яА-ЯёЁ]/.test(text)

    if (!hasCyrillic) {
      // Already in English or no need to translate
      return text
    }

    const prompt = `Переведи следующий текст на английский язык. Верни только перевод, без объяснений:

"${text}"

Перевод:`

    const content = await callOpenRouter([{ role: 'user', content: prompt }], 200)
    return content.trim().replace(/^["']|["']$/g, '')
  } catch (error) {
    console.error('Translation error:', error)
    return text // Return original if translation fails
  }
}
