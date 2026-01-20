# Pain Radar: Анализ источников и техническое решение

## Исследование выполнено: 2026-01-21

---

## 📊 Сводка по бесплатным источникам данных

### ✅ Рекомендуемые источники (100% бесплатные)

| Источник | API | Доступ | Rate Limits | Качество данных |
|----------|-----|--------|-------------|-----------------|
| **Reddit** | PRAW (Python), snoowrap (Node) | ✅ Бесплатный | 60 req/min | ⭐⭐⭐⭐⭐ Отличное |
| **Hacker News** | Algolia HN API | ✅ Бесплатный | Нет (пагинация до 1000) | ⭐⭐⭐⭐ Высокое |
| **IndieHackers** | Web scraping | ✅ Публичный | N/A | ⭐⭐⭐⭐ Высокое |
| **ProductHunt** | GraphQL API | ✅ Бесплатный (с ключом) | 100 req/hour | ⭐⭐⭐⭐ Высокое |

### ⚠️ Платные/ограниченные источники

| Источник | Стоимость | Проблема |
|----------|-----------|----------|
| **Twitter/X API** | $42,000/мес Enterprise | ❌ 1 req/15 min на free tier |
| **Threads** | Требует Business верификацию | ⚠️ Доступ только для бизнеса |
| **Instagram** | Закрытый API | ❌ Нет публичного доступа |

---

## 🎯 Рекомендованная архитектура для PASEKA IT CRM

### Фаза 1: MVP (2-3 недели)

**Источники данных:**
1. ✅ **Reddit** - основной источник (уже в плане)
2. ✅ **Hacker News** - добавить через Algolia API
3. ✅ **IndieHackers** - ручной мониторинг или scraping

**Технический стек:**
```
Reddit:     snoowrap (уже выбран) ✓
HN:         Algolia HN REST API (новое)
AI:         Claude Opus 4.5 через OpenRouter (уже выбран) ✓
Database:   PostgreSQL + Prisma (уже есть) ✓
```

---

## 🔧 Техническая реализация

### 1. Reddit Integration (✅ Уже в плане)

**Библиотека:** `snoowrap`
```javascript
import Snoowrap from 'snoowrap'

const reddit = new Snoowrap({
  userAgent: 'PASEKA_CRM_PainRadar/1.0',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  refreshToken: process.env.REDDIT_REFRESH_TOKEN,
})
```

**Best Practices из успешных кейсов:**
- ✅ Age filtering: 5-90 дней (свежие, но не шум)
- ✅ Deduplication через platformId
- ✅ Score threshold: минимум 5-10 upvotes
- ✅ Comment count filter: минимум 3-5 комментариев

**Subreddits для B2B/IT болей:**
```javascript
const targetSubreddits = [
  'startups',
  'entrepreneur',
  'smallbusiness',
  'SaaS',
  'ProductManagement',
  'webdev',
  'programming',
  'freelance',
  'digitalnomad',
  'productivity',
  'RemoteWork'
]
```

---

### 2. Hacker News Integration (🆕 Новое)

**API:** Algolia HN Search API (100% бесплатный)

**Endpoints:**
```
Search by relevance: GET https://hn.algolia.com/api/v1/search?query=...
Search by date:      GET https://hn.algolia.com/api/v1/search_by_date?query=...
Get item details:    GET https://hn.algolia.com/api/v1/items/:id
```

**Параметры:**
```typescript
interface HNSearchParams {
  query: string              // Поисковый запрос
  tags: string               // Фильтр: 'story', 'ask_hn', 'show_hn', 'job'
  numericFilters?: string    // Например: 'points>50,num_comments>5'
  hitsPerPage: number        // По умолчанию 20, макс 1000
  page: number               // Страница (0-based)
}
```

**Пример использования:**
```typescript
// lib/social/hackernews.ts
export async function searchHackerNews(keyword: string, limit: number = 50) {
  const params = new URLSearchParams({
    query: keyword,
    tags: 'ask_hn,show_hn',  // Только Ask HN и Show HN
    numericFilters: 'points>20,num_comments>3',
    hitsPerPage: limit.toString(),
  })

  const response = await fetch(
    `https://hn.algolia.com/api/v1/search_by_date?${params}`
  )
  const data = await response.json()

  return data.hits.map(hit => ({
    id: hit.objectID,
    author: hit.author,
    title: hit.title,
    content: hit.story_text || hit.title,
    url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    score: hit.points,
    comments: hit.num_comments,
    createdAt: new Date(hit.created_at),
  }))
}
```

**Лучшие tags для болей:**
- `ask_hn` - вопросы от комьюнити (проблемы)
- `show_hn` - демонстрация решений
- Фильтр по points > 20 и comments > 5

---

### 3. AI Analysis Architecture (улучшенная версия)

**Двухступенчатый подход** (из успешных кейсов):

#### Stage 1: Filtering (быстро и дешево)
```typescript
// Используем Claude Haiku для фильтрации
const MODEL_FILTER = 'anthropic/claude-3-haiku'

async function filterRelevantPosts(posts: SocialPost[]) {
  const prompt = `
Ты - эксперт по определению бизнес-проблем в IT.

Оцени каждый пост по шкале 0-100 на наличие РЕАЛЬНОЙ бизнес-боли:
- 80-100: Серьезная проблема, требующая решения
- 50-79: Умеренная боль, есть потенциал
- 0-49: Не релевантно

Посты:
${posts.map((p, i) => `${i + 1}. ${p.title}\n${p.content.substring(0, 200)}`).join('\n\n')}

Верни ТОЛЬКО JSON массив с scores: [85, 23, 67, ...]
`

  const response = await callOpenRouter(MODEL_FILTER, prompt, 200)
  const scores = JSON.parse(response)

  return posts.filter((_, idx) => scores[idx] >= 50)
}
```

#### Stage 2: Deep Analysis (только для прошедших фильтр)
```typescript
// Используем Claude Opus для детального анализа
const MODEL_ANALYSIS = 'anthropic/claude-opus-4-5'

async function extractPainPoints(posts: SocialPost[]) {
  const prompt = `
Проанализируй посты и извлеки конкретные боли.

Для КАЖДОЙ боли верни:
{
  "painText": "Четкое описание боли",
  "category": "TIME_MANAGEMENT|COST|TECHNICAL|...",
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "sentiment": -1.0 до 1.0,
  "confidence": 0.0 до 1.0,
  "keywords": ["ключевые", "слова"],
  "context": "Контекст из поста",
  "evidence": "Прямая цитата из поста"
}

Посты:
${posts.map(p => `Пост от ${p.author}:\n${p.content}`).join('\n\n---\n\n')}

Верни JSON: { "pains": [...] }
`

  const response = await callOpenRouter(MODEL_ANALYSIS, prompt, 2000)
  return JSON.parse(response).pains
}
```

**Экономия:**
- Stage 1 (Haiku): $0.25/1M токенов
- Stage 2 (Opus): только для ~30% постов после фильтра
- Итоговая экономия: ~60-70% vs анализ всех постов Opus

---

## 📐 Обновленная Database Schema

Добавить новую платформу и улучшить структуру:

```prisma
enum SocialPlatform {
  REDDIT
  HACKERNEWS  // 🆕 Добавить
  TWITTER
  THREADS
  INDIEHACKERS  // 🆕 На будущее
}

model SocialPost {
  // ... existing fields

  // 🆕 Добавить поля для фильтрации
  filterScore    Int?      // Score из Stage 1 filtering
  filteredAt     DateTime? // Когда был отфильтрован

  // Улучшить индексы
  @@index([platform, publishedAt(sort: Desc)])
  @@index([platform, engagement(sort: Desc)])
  @@index([filterScore(sort: Desc)])
}

model ExtractedPain {
  // ... existing fields

  // 🆕 Добавить evidence для проверки
  evidence       String?   @db.Text  // Прямая цитата
  sourceUrl      String?   // Прямая ссылка на пост

  // Улучшить для semantic search
  @@index([workspaceId, frequency(sort: Desc)])
  @@index([workspaceId, severity, createdAt(sort: Desc)])
}
```

---

## 🚀 Пошаговый план интеграции новых источников

### Шаг 1: Добавить Hacker News support (3-4 дня)

**1.1 Backend API** (1.5 дня)
```bash
# Установка не требуется - прямые HTTP запросы
```

- [ ] Создать `lib/social/hackernews.ts` с функциями:
  - `searchHackerNews(keyword, limit)`
  - `getHNItem(id)` для деталей поста
- [ ] Обновить `app/api/pain-radar/scan/route.ts`:
  - Добавить поддержку platform: 'HACKERNEWS'
  - Использовать HN API вместо Reddit
- [ ] Добавить `HACKERNEWS` в enum SocialPlatform

**1.2 UI Updates** (1 день)
- [ ] В KeywordManager добавить Platform selector (Reddit/HN)
- [ ] В PostSelector показывать platform badge
- [ ] Адаптировать карточки постов под HN формат

**1.3 Testing** (0.5 дня)
- [ ] Тест сканирования HN по keyword
- [ ] Тест deduplication
- [ ] Проверить AI анализ HN постов

**1.4 Migration** (1 день)
- [ ] Prisma migration для HACKERNEWS enum
- [ ] Deploy и тест на production

---

### Шаг 2: Двухступенчатый AI анализ (2 дня)

**2.1 Filtering Stage** (1 день)
- [ ] Создать `lib/ai/filter-posts.ts`:
  - Функция `filterRelevantPosts()` с Haiku
  - Batch обработка (50 постов за раз)
  - Сохранение filterScore в БД
- [ ] Обновить `app/api/pain-radar/analyze/route.ts`:
  - Сначала фильтрация всех постов
  - Затем анализ только с score >= 50

**2.2 Deep Analysis** (1 день)
- [ ] Улучшить промпт в `lib/ai.ts:extractPainsFromPosts()`:
  - Добавить extraction evidence (цитат)
  - Улучшить структуру JSON
  - Увеличить context до 4000 токенов
- [ ] Добавить сохранение evidence в БД

---

### Шаг 3: IndieHackers Integration (опционально, 3-4 дня)

**Подход:** Web scraping (т.к. нет публичного API)

```typescript
// lib/social/indiehackers.ts
import * as cheerio from 'cheerio'

export async function scrapeIndieHackers(keyword: string) {
  const url = `https://www.indiehackers.com/search?q=${encodeURIComponent(keyword)}`
  const response = await fetch(url)
  const html = await response.text()
  const $ = cheerio.load(html)

  const posts = []
  $('.feed-item').each((i, el) => {
    posts.push({
      id: $(el).attr('data-id'),
      author: $(el).find('.author').text(),
      title: $(el).find('.feed-item__title').text(),
      content: $(el).find('.feed-item__content').text(),
      url: 'https://www.indiehackers.com' + $(el).find('a').attr('href'),
      likes: parseInt($(el).find('.upvote-count').text()),
      comments: parseInt($(el).find('.comment-count').text()),
    })
  })

  return posts
}
```

⚠️ **Риски:**
- Может нарушать ToS IndieHackers
- Хрупкий код (зависит от HTML структуры)
- Рекомендуется добавлять delays между запросами

**Альтернатива:** Ручной мониторинг IH + ручное добавление постов

---

## 💡 Best Practices из успешных кейсов

### 1. От PainOnSocial

**Что работает:**
- ✅ Кураторский подход: 30+ отобранных сабреддитов
- ✅ AI scoring по frequency + intensity + engagement
- ✅ Evidence-based: цитаты + permalink + upvotes
- ✅ Timeframe filtering: последние 7/30/90 дней

**Применяем:**
```typescript
// При сканировании
const targetSubreddits = [
  'startups',
  'entrepreneur',
  'smallbusiness',
  // ... кураторский список
]

// При анализе
const painScore = calculatePainScore({
  frequency: mentionCount,
  intensity: sentimentScore * -1,  // Негатив = боль
  engagement: upvotes + comments * 2
})
```

---

### 2. От Reddit_Scrapper (GitHub)

**Архитектурные решения:**
- ✅ Batch API для GPT (экономия 50%)
- ✅ SQLite для локального кэша
- ✅ Age filtering: 5-90 дней
- ✅ Monthly budget caps
- ✅ Primary/exploratory subreddit rotation

**Применяем:**
```typescript
// Rate limiting config
const LIMITS = {
  REDDIT_RPM: 60,
  AI_BATCH_SIZE: 10,
  MONTHLY_BUDGET_USD: 50,
  POST_AGE_MIN_DAYS: 5,
  POST_AGE_MAX_DAYS: 90,
}

// Cost tracking
async function trackAICost(tokensUsed: number, model: string) {
  const costs = {
    'claude-3-haiku': 0.25 / 1_000_000,
    'claude-opus-4-5': 15 / 1_000_000,  // Input
  }

  const cost = tokensUsed * costs[model]
  await db.aiUsage.create({ /* ... */ })

  const monthTotal = await db.aiUsage.aggregate({ /* current month */ })
  if (monthTotal > LIMITS.MONTHLY_BUDGET_USD) {
    throw new Error('Monthly AI budget exceeded')
  }
}
```

---

### 3. От Algolia HN API integration

**Лучшие практики поиска:**
```typescript
// Точный поиск болей
const searchQueries = [
  'struggling with',
  'pain point',
  'frustrated by',
  'wish there was',
  'looking for solution',
  'does anyone know',
  'help with',
]

// Для каждого keyword
for (const query of searchQueries) {
  const results = await searchHackerNews(
    `${keyword} ${query}`,
    { tags: 'ask_hn', numericFilters: 'points>20' }
  )
}
```

---

## 📊 Оценка стоимости AI анализа

### Текущий подход (все посты через Opus)
```
100 постов × 1000 токенов = 100k токенов
100k × $15/1M = $1.50 за 100 постов
```

### Двухступенчатый подход
```
Stage 1 (Haiku):
100 постов × 500 токенов = 50k токенов
50k × $0.25/1M = $0.0125

Stage 2 (Opus) - только 30% прошли фильтр:
30 постов × 1500 токенов = 45k токенов
45k × $15/1M = $0.675

ИТОГО: $0.0125 + $0.675 = $0.69 за 100 постов
Экономия: 54%
```

---

## 🎯 Итоговые рекомендации

### Приоритет 1 (Must Have для MVP)
1. ✅ Reddit через snoowrap (уже в плане)
2. 🆕 Hacker News через Algolia API
3. 🆕 Двухступенчатый AI анализ (Haiku + Opus)
4. ✅ Evidence extraction (цитаты из постов)

### Приоритет 2 (Nice to Have)
5. 🔜 IndieHackers scraping или ручной мониторинг
6. 🔜 ProductHunt API integration
7. 🔜 Automated subreddit/source discovery

### НЕ рекомендуется для MVP
- ❌ Twitter/X API (слишком дорого)
- ❌ Threads (требует Business account)
- ❌ Instagram (нет API)

---

## 📚 Источники

### Исследование API и платформ:
- [Top Social Listening APIs in 2026](https://data365.co/blog/top-social-listening-api)
- [Best Reddit Monitoring Tool](https://painonsocial.com/blog/best-reddit-monitoring-tool-2)
- [Threads API Documentation](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api)
- [Reddit API Alternative Options](https://painonsocial.com/blog/reddit-api-alternative)
- [Best Twitter API Alternatives 2026](https://www.xpoz.ai/blog/comparisons/best-twitter-api-alternatives-2026/)

### Технические реализации:
- [GitHub: Reddit_Scrapper with GPT](https://github.com/Mohamedsaleh14/Reddit_Scrapper)
- [GitHub: reddit-painpointer](https://github.com/the-wc/reddit-painpointer)
- [GitHub: reddit-pain-point-analyzer](https://github.com/vriznet/reddit-pain-point-analyzer)
- [Algolia HN Search API](https://hn.algolia.com/api)
- [Unlocking Hacker News with Algolia API](https://deepeshsoni.com/archives/70)

### Best Practices и кейсы:
- [PainOnSocial: Pain Point Analysis Guide](https://painonsocial.com/blog/pain-point-analysis-guide-2)
- [How to Find Customer Pain Points on Reddit](https://painonsocial.com/blog/find-customer-pain-points-reddit)
- [35 Indie Hackers Lucrative Niches](https://www.chaodit.com/how-35-indie-hackers-unearthed-lucrative-niches-a-field-guide-to-turning-real-world-pain-points-into-profitable-products)
- [IndieHackers: How to Find Pain Points](https://www.indiehackers.com/forum/how-did-you-find-the-pain-points-2ae1bf64cc)

---

## ✅ Следующие шаги

1. **Обсудить с командой:**
   - Согласовать приоритеты (HN vs IH vs двухступенчатый AI)
   - Определить бюджет на AI анализ
   - Выбрать целевые subreddits и HN tags

2. **Техническая подготовка:**
   - Получить Reddit API credentials (уже в плане)
   - Настроить rate limiting
   - Подготовить миграции БД

3. **Начать разработку:**
   - Следовать плану из Шага 1-3 выше
   - Тестировать на малых объемах данных
   - Мониторить AI costs

---

**Дата создания:** 2026-01-21
**Автор:** Claude Sonnet 4.5
**Статус:** Ready for implementation
