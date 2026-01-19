# Pain Radar - Setup Guide

## Обзор

**Pain Radar** - модуль для анализа болей бизнеса через мониторинг социальных сетей с использованием AI.

### Основные возможности:
- 🔍 Мониторинг Reddit по ключевым словам
- ⚡ Ручной запуск сканирования
- 🎯 Выбор постов для AI анализа (экономия AI бюджета)
- 🤖 Извлечение болей с помощью Claude Opus 4.5
- 📊 Dashboard с топ-болями, категоризацией и sentiment analysis
- 🔗 Интеграция с проектами (AI поиск похожих болей)

---

## Быстрый старт

### 1. Настройка Reddit API

#### Шаг 1: Создать Reddit App
1. Перейти на https://www.reddit.com/prefs/apps
2. Нажать "create another app..." внизу страницы
3. Заполнить форму:
   - **name**: `PASEKA CRM Pain Radar`
   - **app type**: выбрать "script"
   - **description**: `Pain Radar for business pain analysis`
   - **about url**: оставить пустым
   - **redirect uri**: `http://localhost:8080`
4. Нажать "create app"
5. Сохранить:
   - **Client ID**: строка под "personal use script"
   - **Client Secret**: строка напротив "secret"

#### Шаг 2: Получить Refresh Token

Используйте следующий Node.js скрипт:

```javascript
// get-reddit-token.js
const Snoowrap = require('snoowrap');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Reddit OAuth Setup\n');

rl.question('Enter Client ID: ', (clientId) => {
  rl.question('Enter Client Secret: ', (clientSecret) => {
    rl.question('Enter Reddit Username: ', (username) => {
      rl.question('Enter Reddit Password: ', (password) => {

        Snoowrap.fromApplicationOnlyAuth({
          userAgent: 'PASEKA_CRM_PainRadar/1.0.0',
          clientId: clientId,
          clientSecret: clientSecret,
          username: username,
          password: password,
        }).then(r => {
          return r.getMe();
        }).then(me => {
          console.log('\n✅ Successfully authenticated!');
          console.log('\nAdd these to your .env.local:\n');
          console.log(`REDDIT_CLIENT_ID=${clientId}`);
          console.log(`REDDIT_CLIENT_SECRET=${clientSecret}`);
          console.log(`REDDIT_REFRESH_TOKEN=${me.refresh_token || 'USE_PASSWORD_FLOW'}`);

          rl.close();
        }).catch(err => {
          console.error('❌ Error:', err.message);
          rl.close();
        });
      });
    });
  });
});
```

Запустите:
```bash
npm install snoowrap
node get-reddit-token.js
```

#### Шаг 3: Добавить в .env.local

Добавьте следующие переменные в файл `.env.local`:

```env
# Reddit API Credentials
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_REFRESH_TOKEN=your_refresh_token_here
```

### 2. Применить миграцию базы данных

Миграция уже создана и применена, но если нужно переприменить:

```bash
npx prisma migrate dev
```

### 3. Запустить приложение

```bash
npm run dev
```

Откройте http://localhost:3000 и перейдите в раздел **Pain Radar** в главном меню.

---

## Использование

### 1. Добавить ключевое слово

1. Перейти в **Pain Radar** → вкладка **Ключевые слова**
2. Нажать кнопку **Добавить**
3. Ввести ключевое слово (например, "project management tools")
4. Опционально указать категорию
5. Нажать **Добавить**

### 2. Запустить сканирование

1. В списке ключевых слов нажать кнопку **Сканировать** напротив нужного слова
2. Дождаться завершения (появится toast notification)
3. Посты появятся в базе данных

### 3. Выбрать посты для анализа

1. Перейти во вкладку **Посты**
2. Выбрать интересующие посты с помощью чекбоксов
3. Нажать **Анализировать выбранные**
4. Дождаться завершения AI анализа

### 4. Просмотр болей

1. Перейти во вкладку **Боли**
2. Использовать фильтры:
   - По категории (TIME_MANAGEMENT, COST, TECHNICAL, и т.д.)
   - По серьезности (LOW, MEDIUM, HIGH, CRITICAL)
   - По дате
   - Поиск по тексту
3. Кликнуть на карточку боли для просмотра деталей

### 5. Генерация AI рекомендаций

На странице детал боли:
1. Нажать кнопку **Сгенерировать** (AI Рекомендации)
2. Получить:
   - Рекомендации по решению
   - Бизнес-возможности
   - Потенциальные риски

### 6. Поиск похожих проектов

На странице деталей боли:
1. Нажать иконку **поиска** в секции "Похожие проекты"
2. AI найдет проекты с похожими болями
3. Показывается similarity score (0-100%)
4. Можно связать боль с проектом

---

## Архитектура

### Database Models

**PainKeyword** - ключевые слова для мониторинга
- `id`, `workspaceId`, `keyword`, `category`
- `isActive`, `createdById`, `createdAt`

**SocialPost** - собранные посты из соцсетей
- `id`, `keywordId`, `platform`, `platformId`
- `author`, `content`, `url`
- `likes`, `comments`, `engagement`
- `publishedAt`, `isAnalyzed`, `analyzedAt`

**ExtractedPain** - извлеченные боли
- `id`, `postId`, `workspaceId`
- `painText`, `category`, `severity`, `sentiment`
- `confidence`, `keywords`, `frequency`, `trend`
- `aiInsights`, `linkedProjectIds`

**PainScan** - история сканирований
- `id`, `keywordId`, `workspaceId`, `platform`
- `status`, `postsFound`, `postsNew`, `painsExtracted`
- `errorMessage`, `startedAt`, `completedAt`

### API Endpoints

- **GET /api/pain-radar/keywords** - список ключевых слов
- **POST /api/pain-radar/keywords** - создать keyword
- **PATCH /api/pain-radar/keywords/[id]** - обновить keyword
- **DELETE /api/pain-radar/keywords/[id]** - удалить keyword
- **POST /api/pain-radar/scan** - запустить сканирование (async)
- **GET /api/pain-radar/scan/[id]** - статус сканирования
- **GET /api/pain-radar/posts** - список постов
- **POST /api/pain-radar/analyze** - AI анализ постов
- **GET /api/pain-radar/pains** - список болей
- **GET /api/pain-radar/pains/[id]** - детали боли
- **PATCH /api/pain-radar/pains/[id]** - обновить боль
- **POST /api/pain-radar/pains/[id]/insights** - генерация AI insights
- **POST /api/pain-radar/match-projects** - поиск похожих проектов
- **GET /api/pain-radar/dashboard** - метрики для dashboard

### AI Functions

**extractPainsFromPosts()** - извлечение болей из постов
- Batch processing (10 постов за раз)
- Возвращает: painText, category, severity, sentiment, confidence, keywords

**matchPainToProjects()** - семантический поиск похожих проектов
- AI сравнение текстов болей
- Возвращает matches с similarity >= 0.5

**generatePainInsights()** - генерация рекомендаций
- Suggestions (как решить)
- Opportunities (бизнес-возможности)
- Risks (что если не решить)

---

## Лимиты и Rate Limiting

### Reddit API
- **60 requests / minute** (по умолчанию)
- Retry logic с exponential backoff
- Автоматическое ожидание при достижении лимита

### AI API (OpenRouter)
- Настроено через переменную `OPENROUTER_API_KEY`
- Batch processing: до 10 постов за раз
- Rate limiting: можно настроить в `lib/pain-radar/constants.ts`

### Рекомендации
- Сканировать не чаще 1 раза в час для одного keyword
- Анализировать не более 50 постов за раз
- Использовать фильтры для выбора качественных постов

---

## Troubleshooting

### Проблема: "Reddit API authentication failed"
**Решение**: Проверьте правильность REDDIT_CLIENT_ID и REDDIT_CLIENT_SECRET в .env.local

### Проблема: "Reddit API rate limit exceeded"
**Решение**: Подождите 1 минуту перед следующим запросом. Rate limiter автоматически обработает это.

### Проблема: "No pains extracted"
**Решение**:
- Посты могут не содержать явных болей
- Попробуйте выбрать другие посты
- Проверьте что посты на английском или русском языке

### Проблема: "Invalid AI response format"
**Решение**:
- AI иногда возвращает невалидный JSON
- Retry logic автоматически повторит запрос (до 3 раз)
- Если проблема повторяется, проверьте OpenRouter API status

---

## Развитие (Roadmap)

### Phase 2 (Planned)
- ✅ Reddit integration
- ⏳ Twitter/X integration
- ⏳ Threads integration
- ⏳ Automated scheduling (Vercel Cron)

### Phase 3 (Future)
- Advanced analytics (correlation, clustering)
- Trend predictions
- Telegram notifications
- Export to CSV/PDF
- Custom AI models fine-tuning

---

## Поддержка

При возникновении проблем:
1. Проверьте логи в консоли браузера
2. Проверьте логи сервера (terminal где запущен `npm run dev`)
3. Проверьте переменные окружения в `.env.local`
4. Убедитесь что все миграции применены

---

## Changelog

### v1.0.0 (2026-01-20)
- ✅ Начальная реализация Pain Radar
- ✅ Reddit API integration
- ✅ AI pain extraction (Claude Opus 4.5)
- ✅ Dashboard с метриками
- ✅ Semantic project matching
- ✅ AI insights generation
- ✅ Manual post selection
- ✅ Async scanning with polling
- ✅ Rate limiting
- ✅ Navigation integration
