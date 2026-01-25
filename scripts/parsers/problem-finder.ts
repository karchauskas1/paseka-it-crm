import { UnifiedScraper, Platform, ParseResult, ParsedPost } from './index'
import { ParserConfig } from './types'

/**
 * Problem Finder
 *
 * Умный поиск "проблемных" постов - где люди делятся болями,
 * ищут решения, сталкиваются с трудностями.
 *
 * Использует:
 * 1. Проблемные модификаторы запросов
 * 2. Scoring по engagement (лайки, комментарии, просмотры)
 * 3. Анализ контента на "проблемность"
 */

// Проблемные модификаторы для поиска
const PROBLEM_MODIFIERS = {
  // Прямые проблемы
  problems: [
    'проблема',
    'проблемы',
    'не работает',
    'не могу',
    'сломался',
    'ошибка',
  ],
  // Поиск помощи
  help: [
    'помогите',
    'подскажите',
    'как решить',
    'что делать',
    'как быть',
    'нужен совет',
  ],
  // Негатив/боль
  pain: [
    'устал от',
    'надоело',
    'бесит',
    'разочарован',
    'обманули',
    'кинули',
  ],
  // Поиск решений
  solutions: [
    'как найти',
    'где найти',
    'посоветуйте',
    'какой выбрать',
    'что лучше',
    'отзывы',
  ],
}

// Слова-индикаторы проблемности в тексте
const PROBLEM_INDICATORS = [
  'проблем', 'ошибк', 'не работа', 'не могу', 'помоги',
  'подскажи', 'что делать', 'как быть', 'устал', 'надоел',
  'бесит', 'разочаров', 'обман', 'кину', 'сломал', 'испорти',
  'не получается', 'не выходит', 'застрял', 'нужен совет',
  'кто сталкивался', 'у кого было', 'как решить', 'как исправить',
  'косяк', 'баг', 'глюк', 'фейл', 'провал', 'неудач',
]

export interface ScoredPost extends ParsedPost {
  engagementScore: number
  problemScore: number
  totalScore: number
  scoreBreakdown: {
    likes: number
    comments: number
    views: number
    problemWords: number
  }
}

export interface ProblemSearchResult {
  query: string
  modifiedQueries: string[]
  platforms: string[]
  totalPosts: number
  scoredPosts: ScoredPost[]
  topProblems: ScoredPost[]
  stats: {
    avgEngagement: number
    avgProblemScore: number
    duration: number
  }
}

export class ProblemFinder {
  private scraper: UnifiedScraper
  private config: ParserConfig

  constructor(config?: ParserConfig) {
    this.config = config || {}
    this.scraper = new UnifiedScraper(config)
  }

  /**
   * Генерирует проблемные вариации запроса
   */
  generateProblemQueries(baseQuery: string, maxVariations: number = 5): string[] {
    const queries: string[] = [baseQuery]

    // Добавляем вариации с модификаторами
    const allModifiers = [
      ...PROBLEM_MODIFIERS.problems,
      ...PROBLEM_MODIFIERS.help,
      ...PROBLEM_MODIFIERS.pain,
      ...PROBLEM_MODIFIERS.solutions,
    ]

    // Перемешиваем и берём первые N
    const shuffled = allModifiers.sort(() => Math.random() - 0.5)

    for (const modifier of shuffled.slice(0, maxVariations - 1)) {
      queries.push(`${modifier} ${baseQuery}`)
    }

    return queries
  }

  /**
   * Рассчитывает engagement score поста
   * Нормализованный от 0 до 100
   */
  calculateEngagementScore(post: ParsedPost): number {
    const likes = post.likes || 0
    const comments = post.comments || 0
    const views = post.views || 0

    // Весовые коэффициенты
    // Комментарии важнее - означают обсуждение/проблему
    const likesWeight = 1
    const commentsWeight = 3 // Комментарии важнее
    const viewsWeight = 0.01 // Просмотры менее важны

    const rawScore =
      (likes * likesWeight) +
      (comments * commentsWeight) +
      (views * viewsWeight)

    // Логарифмическая шкала для нормализации
    // log(1) = 0, log(100) ≈ 4.6, log(10000) ≈ 9.2
    const normalizedScore = rawScore > 0 ? Math.log10(rawScore + 1) * 20 : 0

    return Math.min(100, Math.round(normalizedScore))
  }

  /**
   * Рассчитывает "проблемность" контента
   * Сколько проблемных слов/фраз содержит
   */
  calculateProblemScore(post: ParsedPost): number {
    const content = (post.content || '').toLowerCase()
    const title = (post.title || '').toLowerCase()
    const text = `${title} ${content}`

    let matchCount = 0

    for (const indicator of PROBLEM_INDICATORS) {
      if (text.includes(indicator.toLowerCase())) {
        matchCount++
      }
    }

    // Нормализуем: 0 слов = 0, 5+ слов = 100
    const normalizedScore = Math.min(100, matchCount * 20)

    return normalizedScore
  }

  /**
   * Оценивает и ранжирует посты
   */
  scorePosts(posts: ParsedPost[]): ScoredPost[] {
    return posts.map(post => {
      const engagementScore = this.calculateEngagementScore(post)
      const problemScore = this.calculateProblemScore(post)

      // Итоговый score: 60% engagement + 40% проблемность
      const totalScore = Math.round(engagementScore * 0.6 + problemScore * 0.4)

      return {
        ...post,
        engagementScore,
        problemScore,
        totalScore,
        scoreBreakdown: {
          likes: post.likes || 0,
          comments: post.comments || 0,
          views: post.views || 0,
          problemWords: Math.round(problemScore / 20),
        },
      }
    })
  }

  /**
   * Основной метод поиска проблем
   */
  async findProblems(
    baseQuery: string,
    platforms: Platform[] = ['habr', 'pikabu', 'vc'],
    options: {
      maxVariations?: number
      minEngagement?: number
      minProblemScore?: number
      maxResults?: number
    } = {}
  ): Promise<ProblemSearchResult> {
    const startTime = Date.now()
    const {
      maxVariations = 3,
      minEngagement = 0,
      minProblemScore = 0,
      maxResults = 50,
    } = options

    console.log(`\n🔍 Problem Finder: "${baseQuery}"`)
    console.log(`   Платформы: ${platforms.join(', ')}`)

    // Генерируем запросы
    const queries = this.generateProblemQueries(baseQuery, maxVariations)
    console.log(`   Запросы: ${queries.join(', ')}`)

    // Собираем посты со всех платформ и запросов
    const allPosts: ParsedPost[] = []
    const seenUrls = new Set<string>()

    for (const query of queries) {
      console.log(`\n   Поиск: "${query}"...`)

      try {
        const results = await this.scraper.scrapeSearch(query, platforms)

        for (const [platform, result] of Object.entries(results)) {
          for (const post of result.posts) {
            // Дедупликация по URL
            if (!seenUrls.has(post.url)) {
              seenUrls.add(post.url)
              allPosts.push(post)
            }
          }

          if (result.posts.length > 0) {
            console.log(`     ${platform}: +${result.posts.length} постов`)
          }
        }
      } catch (err) {
        console.error(`     Ошибка: ${err}`)
      }
    }

    console.log(`\n   Всего найдено: ${allPosts.length} уникальных постов`)

    // Оцениваем посты
    let scoredPosts = this.scorePosts(allPosts)

    // Фильтруем по минимальным порогам
    scoredPosts = scoredPosts.filter(p =>
      p.engagementScore >= minEngagement &&
      p.problemScore >= minProblemScore
    )

    // Сортируем по totalScore
    scoredPosts.sort((a, b) => b.totalScore - a.totalScore)

    // Ограничиваем количество
    scoredPosts = scoredPosts.slice(0, maxResults)

    // Топ проблемы - посты с высоким engagement И problem score
    const topProblems = scoredPosts
      .filter(p => p.engagementScore >= 20 && p.problemScore >= 20)
      .slice(0, 10)

    // Статистика
    const avgEngagement = scoredPosts.length > 0
      ? Math.round(scoredPosts.reduce((sum, p) => sum + p.engagementScore, 0) / scoredPosts.length)
      : 0
    const avgProblemScore = scoredPosts.length > 0
      ? Math.round(scoredPosts.reduce((sum, p) => sum + p.problemScore, 0) / scoredPosts.length)
      : 0

    console.log(`\n   После scoring и фильтрации: ${scoredPosts.length} постов`)
    console.log(`   Средний engagement: ${avgEngagement}`)
    console.log(`   Средняя проблемность: ${avgProblemScore}`)
    console.log(`   Топ проблем: ${topProblems.length}`)

    return {
      query: baseQuery,
      modifiedQueries: queries,
      platforms: platforms as string[],
      totalPosts: allPosts.length,
      scoredPosts,
      topProblems,
      stats: {
        avgEngagement,
        avgProblemScore,
        duration: Date.now() - startTime,
      },
    }
  }

  /**
   * Форматирует результаты для вывода
   */
  formatResults(result: ProblemSearchResult): string {
    let output = `\n${'='.repeat(60)}\n`
    output += `🔍 PROBLEM FINDER: "${result.query}"\n`
    output += `${'='.repeat(60)}\n\n`

    output += `📊 Статистика:\n`
    output += `   Платформы: ${result.platforms.join(', ')}\n`
    output += `   Запросы: ${result.modifiedQueries.length}\n`
    output += `   Найдено постов: ${result.totalPosts}\n`
    output += `   После фильтрации: ${result.scoredPosts.length}\n`
    output += `   Средний engagement: ${result.stats.avgEngagement}/100\n`
    output += `   Средняя проблемность: ${result.stats.avgProblemScore}/100\n`
    output += `   Время: ${(result.stats.duration / 1000).toFixed(1)}с\n\n`

    if (result.topProblems.length > 0) {
      output += `🔥 ТОП ПРОБЛЕМЫ (высокий engagement + проблемность):\n`
      output += `${'─'.repeat(60)}\n`

      for (let i = 0; i < result.topProblems.length; i++) {
        const post = result.topProblems[i]
        const title = (post.title || post.content).slice(0, 80)

        output += `\n${i + 1}. ${title}${title.length >= 80 ? '...' : ''}\n`
        output += `   📈 Score: ${post.totalScore} (engagement: ${post.engagementScore}, problem: ${post.problemScore})\n`
        output += `   👍 ${post.scoreBreakdown.likes} | 💬 ${post.scoreBreakdown.comments} | 👁 ${post.scoreBreakdown.views}\n`
        output += `   🏷️ ${post.platform} | 👤 ${post.authorUsername}\n`
        output += `   🔗 ${post.url}\n`
      }
    }

    if (result.scoredPosts.length > result.topProblems.length) {
      output += `\n\n📝 ВСЕ РЕЗУЛЬТАТЫ (топ 20):\n`
      output += `${'─'.repeat(60)}\n`

      for (let i = 0; i < Math.min(20, result.scoredPosts.length); i++) {
        const post = result.scoredPosts[i]
        const title = (post.title || post.content).slice(0, 60)

        output += `${i + 1}. [${post.totalScore}] ${title}... (${post.platform})\n`
        output += `   👍${post.scoreBreakdown.likes} 💬${post.scoreBreakdown.comments} 👁${post.scoreBreakdown.views}\n`
      }
    }

    return output
  }
}

/**
 * Экспорт для использования в CLI
 */
export async function runProblemSearch(
  query: string,
  platforms: Platform[],
  config?: ParserConfig
): Promise<ProblemSearchResult> {
  const finder = new ProblemFinder(config)
  return finder.findProblems(query, platforms)
}
