import { ScoredPost } from './problem-finder'

/**
 * AI Analyzer для анализа найденных проблем
 * Использует OpenRouter API (бесплатные модели)
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Модели на OpenRouter (от дешёвых к дорогим)
// Цены: https://openrouter.ai/models
const MODELS = [
  'meta-llama/llama-3.2-3b-instruct:free',     // Бесплатно (может быть перегружен)
  'google/gemini-2.0-flash-001',                // $0.1/M токенов - очень дёшево
  'anthropic/claude-3-haiku',                   // $0.25/M - дёшево и качественно
  'openai/gpt-4o-mini',                         // $0.15/M - баланс цена/качество
]

export interface AnalysisResult {
  summary: string
  categories: {
    name: string
    count: number
    examples: string[]
  }[]
  topInsights: string[]
  recommendations: string[]
  rawAnalysis: string
}

export class AIAnalyzer {
  private apiKey: string
  private model: string
  private modelIndex: number = 0

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || ''
    this.model = model || MODELS[0]

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY не найден. Установите переменную окружения или передайте ключ.')
    }
  }

  private nextModel(): boolean {
    this.modelIndex++
    if (this.modelIndex < MODELS.length) {
      this.model = MODELS[this.modelIndex]
      return true
    }
    return false
  }

  /**
   * Анализирует список проблем и возвращает структурированный отчёт
   */
  async analyzePosts(posts: ScoredPost[], topic: string): Promise<AnalysisResult> {
    if (posts.length === 0) {
      return {
        summary: 'Нет данных для анализа',
        categories: [],
        topInsights: [],
        recommendations: [],
        rawAnalysis: '',
      }
    }

    // Готовим данные для анализа (берём топ 30 постов)
    const postsForAnalysis = posts.slice(0, 30).map((p, i) => ({
      n: i + 1,
      title: (p.title || p.content).slice(0, 200),
      platform: p.platform,
      engagement: p.engagementScore,
      likes: p.scoreBreakdown.likes,
      comments: p.scoreBreakdown.comments,
    }))

    const prompt = `Ты — аналитик проблем пользователей. Проанализируй найденные посты по теме "${topic}".

ПОСТЫ:
${postsForAnalysis.map(p => `${p.n}. [${p.platform}] ${p.title} (👍${p.likes} 💬${p.comments})`).join('\n')}

ЗАДАЧА:
1. Выдели 3-5 основных КАТЕГОРИЙ проблем (например: "Цена", "Качество", "Сервис")
2. Для каждой категории укажи количество постов и 1-2 примера
3. Сформулируй 3-5 ключевых ИНСАЙТОВ (что беспокоит людей больше всего)
4. Дай 2-3 РЕКОМЕНДАЦИИ для бизнеса

ФОРМАТ ОТВЕТА (строго JSON):
{
  "summary": "Краткое резюме в 2-3 предложениях",
  "categories": [
    {"name": "Название категории", "count": 5, "examples": ["пример 1", "пример 2"]}
  ],
  "topInsights": ["инсайт 1", "инсайт 2"],
  "recommendations": ["рекомендация 1", "рекомендация 2"]
}

Отвечай ТОЛЬКО JSON, без markdown и пояснений.`

    try {
      console.log(`\n🤖 Анализ через AI (${this.model})...`)

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://paseka-crm.local',
          'X-Title': 'PASEKA CRM Problem Analyzer',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`OpenRouter ошибка (${this.model}): ${response.status}`)

        // Пробуем следующую модель
        if (this.nextModel()) {
          console.log(`Пробуем: ${this.model}...`)
          return this.analyzePosts(posts, topic)
        }

        throw new Error(`Все модели недоступны. Последняя ошибка: ${response.status}`)
      }

      const data = await response.json()
      const rawAnalysis = data.choices?.[0]?.message?.content || ''

      // Парсим JSON из ответа
      let parsed: any = {}
      try {
        // Убираем возможные markdown обёртки
        const jsonStr = rawAnalysis
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        parsed = JSON.parse(jsonStr)
      } catch (e) {
        console.error('Не удалось распарсить JSON:', rawAnalysis.slice(0, 200))
        // Возвращаем сырой анализ
        return {
          summary: rawAnalysis.slice(0, 500),
          categories: [],
          topInsights: [],
          recommendations: [],
          rawAnalysis,
        }
      }

      return {
        summary: parsed.summary || 'Анализ завершён',
        categories: parsed.categories || [],
        topInsights: parsed.topInsights || [],
        recommendations: parsed.recommendations || [],
        rawAnalysis,
      }
    } catch (err) {
      console.error('Ошибка AI анализа:', err)
      return {
        summary: `Ошибка анализа: ${err}`,
        categories: [],
        topInsights: [],
        recommendations: [],
        rawAnalysis: '',
      }
    }
  }

  /**
   * Форматирует результат анализа для вывода
   */
  formatAnalysis(result: AnalysisResult): string {
    let output = '\n\n'
    output += '🤖 AI-АНАЛИЗ ПРОБЛЕМ\n'
    output += '═'.repeat(60) + '\n\n'

    output += '📋 РЕЗЮМЕ:\n'
    output += `   ${result.summary}\n\n`

    if (result.categories.length > 0) {
      output += '📂 КАТЕГОРИИ ПРОБЛЕМ:\n'
      for (const cat of result.categories) {
        output += `   • ${cat.name} (${cat.count} постов)\n`
        for (const ex of cat.examples.slice(0, 2)) {
          output += `     - "${ex.slice(0, 60)}..."\n`
        }
      }
      output += '\n'
    }

    if (result.topInsights.length > 0) {
      output += '💡 КЛЮЧЕВЫЕ ИНСАЙТЫ:\n'
      for (let i = 0; i < result.topInsights.length; i++) {
        output += `   ${i + 1}. ${result.topInsights[i]}\n`
      }
      output += '\n'
    }

    if (result.recommendations.length > 0) {
      output += '✅ РЕКОМЕНДАЦИИ ДЛЯ БИЗНЕСА:\n'
      for (let i = 0; i < result.recommendations.length; i++) {
        output += `   ${i + 1}. ${result.recommendations[i]}\n`
      }
    }

    return output
  }
}

/**
 * Быстрый анализ без создания объекта
 */
export async function quickAnalyze(
  posts: ScoredPost[],
  topic: string,
  apiKey?: string
): Promise<string> {
  const analyzer = new AIAnalyzer(apiKey)
  const result = await analyzer.analyzePosts(posts, topic)
  return analyzer.formatAnalysis(result)
}
