#!/usr/bin/env npx tsx

// Загружаем переменные окружения
import 'dotenv/config'

/**
 * CLI для парсинга платформ
 *
 * Использование:
 *   npx tsx scripts/parsers/cli.ts --help
 *   npx tsx scripts/parsers/cli.ts popular --platform vc
 *   npx tsx scripts/parsers/cli.ts search "автоматизация бизнеса" --platform vc,pikabu
 *   npx tsx scripts/parsers/cli.ts profile zuckerberg --platform threads
 *   npx tsx scripts/parsers/cli.ts category marketing --platform vc
 */

import {
  UnifiedScraper,
  VCScraper,
  PikabuScraper,
  XScraper,
  ThreadsScraper,
  HabrScraper,
  ZenScraper,
  TelegramScraper,
  MailRuScraper,
  TenChatScraper,
  ProblemFinder,
  AIAnalyzer,
  formatResultsSummary,
  formatResultsAsCSV,
  deduplicateResults,
  sortByPopularity,
  ParseResult,
  Platform,
} from './index'
import * as fs from 'fs'
import * as path from 'path'

// Парсинг аргументов командной строки
const args = process.argv.slice(2)

function printHelp() {
  console.log(`
📡 Парсер платформ (VC.ru, Pikabu, X, Threads, Habr, Zen, Telegram, Mail.ru)

Использование:
  npx tsx scripts/parsers/cli.ts <команда> [опции]

Команды:
  popular                     Парсить популярное
  search <запрос>             Поиск по запросу
  problems <тема>             🔥 Умный поиск проблем (с scoring)
  profile <username>          Парсить профиль
  category <название>         Парсить категорию (VC.ru, Zen, Mail.ru)
  tag <тег>                   Парсить по тегу (Pikabu)
  hub <название>              Парсить хаб (Habr)
  channel <@канал>            Парсить Telegram канал
  user-posts <username>       Парсить посты пользователя

Платформы:
  vc        - VC.ru (бизнес, стартапы, маркетинг)
  pikabu    - Pikabu (развлекательный контент)
  x         - X/Twitter (через Nitter)
  threads   - Threads (Meta)
  habr      - Habr (IT, технологии, разработка)
  zen       - Яндекс.Дзен (блоги, статьи)
  telegram  - Telegram каналы (публичные)
  mailru    - Ответы Mail.ru (Q&A, проблемы людей)
  tenchat   - TenChat (бизнес-сеть, российский LinkedIn)
  all       - Все платформы

Опции:
  --platform, -p <платформы>  Платформы через запятую (default: habr,pikabu,vc)
  --max-posts <число>         Максимум постов (default: 50)
  --max-pages <число>         Максимум страниц для скролла (default: 5)
  --output, -o <файл>         Сохранить в файл (json или csv)
  --headless <true|false>     Режим без GUI (default: true)
  --dedupe                    Удалить дубликаты по URL
  --sort-popular              Сортировать по популярности (лайки + просмотры + комментарии)
  --min-engagement <число>    Минимальный engagement score 0-100 (для problems)
  --min-problem <число>       Минимальный problem score 0-100 (для problems)
  --analyze                   🤖 AI-анализ результатов (OpenRouter, бесплатно)
  --help, -h                  Показать эту справку

Примеры:
  # Популярное с Habr (IT)
  npx tsx scripts/parsers/cli.ts popular -p habr

  # Поиск по всем платформам
  npx tsx scripts/parsers/cli.ts search "автоматизация бизнеса"

  # Поиск проблем на Q&A платформе
  npx tsx scripts/parsers/cli.ts search "проблемы с маркетингом" -p mailru

  # Популярные вопросы с Mail.ru
  npx tsx scripts/parsers/cli.ts popular -p mailru

  # Хаб на Habr
  npx tsx scripts/parsers/cli.ts hub marketing -p habr

  # Telegram канал
  npx tsx scripts/parsers/cli.ts channel durov -p telegram

  # Категория Zen
  npx tsx scripts/parsers/cli.ts category business -p zen

  # Поиск с сортировкой по популярности
  npx tsx scripts/parsers/cli.ts search "AI" -p habr,vc --sort-popular --dedupe

  # Профиль на X
  npx tsx scripts/parsers/cli.ts profile elonmusk -p x

  # 🔥 ПОИСК ПРОБЛЕМ (умный поиск с scoring)
  npx tsx scripts/parsers/cli.ts problems "фитнес тренер" -p habr,pikabu,vc

  # Поиск проблем с фильтром по engagement
  npx tsx scripts/parsers/cli.ts problems "маркетинг" --min-engagement 20

  # Поиск массовых проблем (высокий engagement + проблемность)
  npx tsx scripts/parsers/cli.ts problems "бухгалтерия" --min-engagement 30 --min-problem 20
`)
}

function parseArgs() {
  const options: {
    command?: string
    query?: string
    platforms: string[]
    maxPosts: number
    maxPages: number
    output?: string
    headless: boolean
    dedupe: boolean
    sortPopular: boolean
    minEngagement: number
    minProblem: number
    analyze: boolean
  } = {
    platforms: ['habr', 'pikabu', 'vc'], // Рабочие платформы по умолчанию
    maxPosts: 50,
    maxPages: 5,
    headless: true,
    dedupe: false,
    sortPopular: false,
    minEngagement: 0,
    minProblem: 0,
    analyze: false,
  }

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    if (arg === '--platform' || arg === '-p') {
      options.platforms = args[++i]?.split(',') || ['all']
    } else if (arg === '--max-posts') {
      options.maxPosts = parseInt(args[++i]) || 50
    } else if (arg === '--max-pages') {
      options.maxPages = parseInt(args[++i]) || 5
    } else if (arg === '--output' || arg === '-o') {
      options.output = args[++i]
    } else if (arg === '--headless') {
      options.headless = args[++i] !== 'false'
    } else if (arg === '--dedupe') {
      options.dedupe = true
    } else if (arg === '--sort-popular') {
      options.sortPopular = true
    } else if (arg === '--min-engagement') {
      options.minEngagement = parseInt(args[++i]) || 0
    } else if (arg === '--min-problem') {
      options.minProblem = parseInt(args[++i]) || 0
    } else if (arg === '--analyze') {
      options.analyze = true
    } else if (!arg.startsWith('-')) {
      if (!options.command) {
        options.command = arg
      } else if (!options.query) {
        options.query = arg
      }
    }

    i++
  }

  return options
}

async function saveResults(results: Record<string, ParseResult>, outputPath: string) {
  const ext = path.extname(outputPath).toLowerCase()

  if (ext === '.csv') {
    const csv = formatResultsAsCSV(results)
    fs.writeFileSync(outputPath, csv, 'utf-8')
  } else {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8')
  }

  console.log(`\n💾 Результаты сохранены в: ${outputPath}`)
}

async function main() {
  if (args.length === 0) {
    printHelp()
    process.exit(0)
  }

  const options = parseArgs()

  if (!options.command) {
    console.error('❌ Укажите команду. Используйте --help для справки.')
    process.exit(1)
  }

  const config = {
    maxPosts: options.maxPosts,
    maxPages: options.maxPages,
    headless: options.headless,
  }

  const scraper = new UnifiedScraper(config)
  let results: Record<string, ParseResult> = {}

  console.log(`\n🚀 Запуск парсинга...`)
  console.log(`   Команда: ${options.command}`)
  console.log(`   Платформы: ${options.platforms.join(', ')}`)
  if (options.query) console.log(`   Запрос: ${options.query}`)
  console.log('')

  const startTime = Date.now()

  try {
    switch (options.command) {
      case 'popular':
        results = await scraper.scrapePopular(options.platforms as Platform[])
        break

      case 'search':
        if (!options.query) {
          console.error('❌ Укажите поисковый запрос')
          process.exit(1)
        }
        results = await scraper.scrapeSearch(options.query, options.platforms as Platform[])
        break

      case 'problems': {
        if (!options.query) {
          console.error('❌ Укажите тему для поиска проблем')
          process.exit(1)
        }

        const finder = new ProblemFinder(config)
        const problemResult = await finder.findProblems(
          options.query,
          options.platforms as Platform[],
          {
            minEngagement: options.minEngagement,
            minProblemScore: options.minProblem,
            maxResults: options.maxPosts,
          }
        )

        // Выводим красивый отчёт
        console.log(finder.formatResults(problemResult))

        // AI анализ если запрошен
        if (options.analyze && problemResult.scoredPosts.length > 0) {
          try {
            const analyzer = new AIAnalyzer()
            const analysis = await analyzer.analyzePosts(problemResult.scoredPosts, options.query)
            console.log(analyzer.formatAnalysis(analysis))
          } catch (err) {
            console.error(`\n⚠️ AI анализ недоступен: ${err}`)
          }
        }

        // Сохраняем если нужно
        if (options.output) {
          const ext = options.output.split('.').pop()?.toLowerCase()
          if (ext === 'json') {
            fs.writeFileSync(options.output, JSON.stringify(problemResult, null, 2))
          } else if (ext === 'csv') {
            const lines = ['platform,score,engagement,problem,title,author,url,likes,comments,views']
            for (const post of problemResult.scoredPosts) {
              lines.push([
                post.platform,
                post.totalScore,
                post.engagementScore,
                post.problemScore,
                `"${(post.title || post.content).replace(/"/g, '""').slice(0, 100)}"`,
                post.authorUsername,
                post.url,
                post.scoreBreakdown.likes,
                post.scoreBreakdown.comments,
                post.scoreBreakdown.views,
              ].join(','))
            }
            fs.writeFileSync(options.output, lines.join('\n'))
          }
          console.log(`\n💾 Результаты сохранены в: ${options.output}`)
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`\n⏱️  Общее время: ${totalTime}с`)
        return // Выходим, т.к. уже вывели результаты
      }

      case 'profile':
        if (!options.query) {
          console.error('❌ Укажите username')
          process.exit(1)
        }
        if (options.platforms[0] === 'all') {
          console.error('❌ Для профиля укажите конкретную платформу: -p vc|pikabu|x|threads|habr|zen')
          process.exit(1)
        }
        const profile = await scraper.scrapeProfile(options.query, options.platforms[0] as Platform)
        if (profile) {
          results = {
            [options.platforms[0]]: {
              success: true,
              platform: options.platforms[0],
              profiles: [profile],
              posts: [],
              errors: [],
              stats: { profilesFound: 1, postsFound: 0, duration: Date.now() - startTime },
            },
          }
          console.log('\n👤 Профиль:')
          console.log(`   Имя: ${profile.displayName}`)
          console.log(`   Username: @${profile.username}`)
          if (profile.bio) console.log(`   Bio: ${profile.bio.slice(0, 100)}...`)
          if (profile.followers) console.log(`   Подписчики: ${profile.followers}`)
          if (profile.postsCount) console.log(`   Постов: ${profile.postsCount}`)
          console.log(`   🔗 ${profile.profileUrl}`)
        } else {
          console.log('❌ Профиль не найден')
        }
        break

      case 'category':
        if (!options.query) {
          console.error('❌ Укажите категорию')
          process.exit(1)
        }
        const platform = options.platforms[0]
        if (platform === 'vc' || options.platforms[0] === 'all') {
          const vcScraper = new VCScraper(config)
          results.vc = await vcScraper.scrapeCategory(options.query)
        }
        if (platform === 'zen') {
          const zenScraper = new ZenScraper(config)
          results.zen = await zenScraper.scrapeCategory(options.query)
        }
        if (platform === 'mailru') {
          const mailruScraper = new MailRuScraper(config)
          results.mailru = await mailruScraper.scrapeCategory(options.query)
        }
        if (Object.keys(results).length === 0) {
          console.error('❌ Категории доступны для: vc, zen, mailru')
          process.exit(1)
        }
        break

      case 'tag':
        if (!options.query) {
          console.error('❌ Укажите тег')
          process.exit(1)
        }
        if (!options.platforms.includes('pikabu') && options.platforms[0] !== 'all') {
          console.error('❌ Теги доступны только для Pikabu')
          process.exit(1)
        }
        const pikabuScraper = new PikabuScraper(config)
        results = { pikabu: await pikabuScraper.scrapeTag(options.query) }
        break

      case 'hub':
        if (!options.query) {
          console.error('❌ Укажите название хаба')
          process.exit(1)
        }
        if (!options.platforms.includes('habr') && options.platforms[0] !== 'all') {
          console.error('❌ Хабы доступны только для Habr')
          process.exit(1)
        }
        const habrScraper = new HabrScraper(config)
        results = { habr: await habrScraper.scrapeHub(options.query) }
        break

      case 'channel':
        if (!options.query) {
          console.error('❌ Укажите @username канала')
          process.exit(1)
        }
        if (!options.platforms.includes('telegram') && options.platforms[0] !== 'all') {
          console.error('❌ Каналы доступны только для Telegram')
          process.exit(1)
        }
        const tgScraper = new TelegramScraper(config)
        const channelUsername = options.query.replace('@', '')
        results = { telegram: await tgScraper.scrapeChannel(channelUsername) }

        // Также получаем инфо о канале
        const channelInfo = await tgScraper.scrapeChannelInfo(channelUsername)
        if (channelInfo) {
          console.log('\n📢 Информация о канале:')
          console.log(`   Название: ${channelInfo.displayName}`)
          console.log(`   Username: @${channelInfo.username}`)
          if (channelInfo.bio) console.log(`   Описание: ${channelInfo.bio.slice(0, 100)}...`)
          if (channelInfo.followers) console.log(`   Подписчики: ${channelInfo.followers}`)
          console.log(`   🔗 ${channelInfo.profileUrl}`)
        }
        break

      case 'user-posts':
        if (!options.query) {
          console.error('❌ Укажите username')
          process.exit(1)
        }
        if (options.platforms[0] === 'all') {
          console.error('❌ Укажите конкретную платформу: -p x|threads')
          process.exit(1)
        }

        if (options.platforms[0] === 'x') {
          const xScraper = new XScraper(config)
          results = { x: await xScraper.scrapeUserTweets(options.query) }
        } else if (options.platforms[0] === 'threads') {
          const threadsScraper = new ThreadsScraper(config)
          results = { threads: await threadsScraper.scrapeUserPosts(options.query) }
        } else {
          console.error('❌ user-posts поддерживается только для x и threads')
          process.exit(1)
        }
        break

      default:
        console.error(`❌ Неизвестная команда: ${options.command}`)
        printHelp()
        process.exit(1)
    }
  } catch (err) {
    console.error('❌ Критическая ошибка:', err)
    process.exit(1)
  }

  // Применяем обработку результатов
  if (options.dedupe) {
    results = deduplicateResults(results)
    console.log('🔄 Дубликаты удалены')
  }
  if (options.sortPopular) {
    results = sortByPopularity(results)
    console.log('📊 Отсортировано по популярности')
  }

  // Вывод результатов
  if (Object.keys(results).length > 0) {
    console.log('\n' + formatResultsSummary(results))

    // Показываем первые 5 результатов
    for (const [platform, result] of Object.entries(results)) {
      if (result.posts.length > 0) {
        console.log(`\n📝 Топ постов (${platform}):`)
        for (const post of result.posts.slice(0, 5)) {
          const title = (post.title || post.content).slice(0, 60)
          console.log(`  • ${title}...`)
          console.log(`    👤 ${post.authorUsername} | 👍 ${post.likes || 0} | 💬 ${post.comments || 0} | 👁 ${post.views || 0}`)
          console.log(`    🔗 ${post.url}`)
        }
      }
    }

    // Сохранение в файл
    if (options.output) {
      await saveResults(results, options.output)
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n⏱️  Общее время: ${totalTime}с`)
}

main().catch(console.error)
