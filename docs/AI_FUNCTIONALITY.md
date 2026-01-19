# AI Функционал в PASEKA IT CRM

## Обзор

PASEKA IT CRM использует Claude AI (Anthropic) через OpenRouter API для автоматизации анализа и генерации контента.

## Конфигурация

### Переменные окружения
```env
OPENROUTER_API_KEY="sk-or-v1-..."
```

### Используемые модели
- **Claude Opus 4.5** (`anthropic/claude-opus-4-5`) - для сложного анализа
- **Claude Sonnet 4** (`claude-sonnet-4-20250514`) - для потоковых ответов

## Доступные функции

### 1. Анализ боли клиента

**Где:** Страница проекта → вкладка "Боль и контекст" → кнопка "Анализ AI"

**Что делает:** Анализирует описание боли клиента и возвращает:
- Основные причины проблемы
- Потенциальные последствия
- Направления решения

**API:** `POST /api/ai/suggestions` с `type: 'pain-analysis'`

**Пример использования:**
```typescript
const response = await fetch('/api/ai/suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'pain-analysis',
    projectId: project.id,
    context: { pain: project.pain }
  })
})
```

### 2. Генерация архитектуры

**Где:** Страница проекта → вкладка "Архитектура" → кнопка "AI предложение"

**Что делает:** Генерирует архитектурное решение на основе боли и целей проекта:
- Рекомендуемый подход
- Ключевые компоненты
- Технологический стек
- Риски и альтернативы

**API:** `POST /api/ai/suggestions` с `type: 'architecture'`

**Пример использования:**
```typescript
const response = await fetch('/api/ai/suggestions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'architecture',
    projectId: project.id,
    context: {
      pain: project.pain,
      goals: project.goals,
      expectedResult: project.expectedResult
    }
  })
})
```

### 3. Декомпозиция задач

**Где:** Модальное окно задачи → кнопка "Декомпозировать с AI"

**Что делает:** Разбивает задачу на 3-7 подзадач по 1-4 часа каждая

**API:** `POST /api/ai/decompose`

**Параметры:**
- `taskTitle` - название задачи
- `taskDescription` - описание задачи
- `projectContext` - контекст проекта (опционально)

**Пример использования:**
```typescript
const response = await fetch('/api/ai/decompose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskTitle: 'Реализовать систему авторизации',
    taskDescription: 'Добавить JWT авторизацию с refresh токенами',
    projectContext: {
      stack: 'Next.js, PostgreSQL, Prisma'
    }
  })
})

const data = await response.json()
// data.subtasks содержит массив подзадач
```

**Компонент:** `<TaskDecomposition />`

### 4. Резюме проекта

**API:** `POST /api/ai/project-summary`

**Параметры:**
- `projectId` - ID проекта
- `audience: 'client' | 'management'` - целевая аудитория

**Для клиента:** Краткое резюме без технических деталей
**Для руководства:** С KPI, рисками и финансами

**Пример использования:**
```typescript
// Резюме для клиента
const response = await fetch('/api/ai/project-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'project-uuid',
    audience: 'client'
  })
})

const data = await response.json()
console.log(data.summary) // Резюме проекта
```

### 5. Потоковые ответы (Streaming)

**API:** `POST /api/ai/stream`

**Использование:** SSE (Server-Sent Events) для постепенного отображения ответа

**Пример использования:**
```typescript
const eventSource = new EventSource(
  '/api/ai/stream?prompt=' + encodeURIComponent(prompt)
)

eventSource.onmessage = (event) => {
  const chunk = event.data
  setResponse(prev => prev + chunk)
}

eventSource.onerror = (error) => {
  console.error('Stream error:', error)
  eventSource.close()
}

// Не забудьте закрыть соединение
// eventSource.close()
```

## Как использовать AI максимально продуктивно

### 1. Заполните контекст перед использованием AI

Для лучших результатов заполните:
- Описание боли клиента
- Цели проекта
- Ожидаемые результаты
- Технологический стек (если известен)

**Пример хорошего контекста:**
```
Боль: Клиент теряет 30% заказов из-за сложной формы оформления заказа
Цели: Упростить процесс оформления, увеличить конверсию на 15%
Ожидаемые результаты: Одностраничный checkout с автозаполнением
```

### 2. Используйте AI на ранних стадиях проекта

AI наиболее эффективен при:
- Первичном анализе боли клиента
- Генерации архитектурных решений
- Планировании структуры задач

### 3. Проверяйте и редактируйте результаты

AI генерирует предложения, но финальное решение за вами:
- ✅ Проверьте технические детали
- ✅ Адаптируйте под специфику проекта
- ✅ Дополните контекстом вашей команды
- ✅ Учтите ограничения бюджета и сроков

### 4. Используйте декомпозицию для больших задач

Сложные задачи (> 8 часов) декомпозируйте с AI:
1. Опишите задачу максимально детально
2. Укажите контекст проекта
3. Получите список подзадач
4. Выберите релевантные
5. Создайте их в системе

**Пример:**
```
Плохо: "Сделать авторизацию"
Хорошо: "Реализовать JWT авторизацию с refresh токенами,
защитой от CSRF, rate limiting и логированием попыток входа"
```

## Архитектура AI системы

### Библиотека [lib/ai.ts](../lib/ai.ts)

Основные функции:

```typescript
// Универсальная функция для запросов к AI
export async function generateAISuggestion(
  prompt: string,
  options?: {
    model?: string
    maxTokens?: number
    temperature?: number
  }
): Promise<string>

// Генерация с streaming
export async function generateStreamingSuggestion(
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void>
```

### API Endpoints

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/api/ai/suggestions` | POST | Генерация предложений (анализ, архитектура) |
| `/api/ai/decompose` | POST | Декомпозиция задач |
| `/api/ai/project-summary` | POST | Резюме проекта |
| `/api/ai/stream` | POST | Потоковая генерация |

### Модели данных

```typescript
// AISuggestion model в Prisma
model AISuggestion {
  id          String   @id @default(uuid())
  projectId   String
  type        AISuggestionType // PAIN_ANALYSIS, ARCHITECTURE, TASK_DECOMPOSITION
  prompt      String
  suggestion  String
  metadata    Json?
  createdById String
  createdAt   DateTime @default(now())

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy   User     @relation(fields: [createdById], references: [id])
}

enum AISuggestionType {
  PAIN_ANALYSIS
  ARCHITECTURE
  TASK_DECOMPOSITION
  PROJECT_SUMMARY
  CUSTOM
}
```

## Ограничения

### Rate Limits
- OpenRouter имеет ограничения на количество запросов в минуту
- Рекомендуется: не более 10 запросов в минуту
- При превышении лимита: HTTP 429 Too Many Requests

### Токены
- Каждый запрос ограничен количеством токенов
- По умолчанию: 500-2000 токенов на ответ
- 1 токен ≈ 4 символа английского текста
- 1 токен ≈ 2-3 символа русского текста

### Контекст
- AI не знает специфику вашего бизнеса
- Предоставляйте максимально полный контекст
- Используйте конкретные термины вашей отрасли

## Стоимость

Стоимость зависит от выбранной модели:

| Модель | Input (за 1M токенов) | Output (за 1M токенов) |
|--------|------------------------|------------------------|
| Claude Opus 4.5 | $15 | $75 |
| Claude Sonnet 4 | $3 | $15 |

**Рекомендации по оптимизации затрат:**
- ✅ Используйте Sonnet для большинства задач
- ✅ Opus только для сложного анализа
- ✅ Кэшируйте результаты в БД (AISuggestion model)
- ✅ Используйте короткие промпты где возможно

**Пример расчета стоимости:**
```
Анализ боли клиента:
- Input: ~500 токенов (контекст проекта)
- Output: ~1000 токенов (анализ)
- Модель: Sonnet

Стоимость = (500 * $3 / 1M) + (1000 * $15 / 1M)
          = $0.0015 + $0.015
          = $0.0165 (~1.6 цента)
```

## Troubleshooting

### AI не работает

1. **Проверьте переменную окружения:**
   ```bash
   echo $OPENROUTER_API_KEY
   ```

2. **Проверьте баланс на OpenRouter:**
   - Откройте https://openrouter.ai/account
   - Проверьте Usage & Billing

3. **Проверьте логи сервера:**
   ```bash
   # Next.js logs
   npm run dev

   # Ищите ошибки типа:
   # "OpenRouter API error: 401 Unauthorized"
   # "OpenRouter API error: 429 Too Many Requests"
   ```

### Медленные ответы

**Проблема:** Ответ AI генерируется более 10 секунд

**Решения:**
1. ✅ Используйте streaming для длинных ответов
2. ✅ Уменьшите `maxTokens` в запросе
3. ✅ Используйте Sonnet вместо Opus (быстрее в 2-3 раза)
4. ✅ Сократите размер промпта

**Пример оптимизации:**
```typescript
// Медленно (до 15 секунд)
const response = await generateAISuggestion(longPrompt, {
  model: 'opus',
  maxTokens: 4000
})

// Быстро (3-5 секунд)
const response = await generateAISuggestion(shortPrompt, {
  model: 'sonnet',
  maxTokens: 1000
})
```

### Нерелевантные результаты

**Проблема:** AI генерирует общие ответы, не учитывающие специфику проекта

**Решения:**
1. ✅ Добавьте больше контекста в запрос
2. ✅ Заполните все поля проекта перед использованием AI
3. ✅ Укажите специфичные требования в промпте
4. ✅ Используйте примеры в промпте

**Пример улучшения промпта:**
```typescript
// Плохо
const prompt = "Проанализируй боль клиента"

// Хорошо
const prompt = `
Проанализируй боль клиента для проекта по разработке CRM системы.

Контекст:
- Отрасль: B2B SaaS для консалтинга
- Размер компании: 2-5 человек
- Текущее решение: Google Sheets + Notion
- Боль: ${project.pain}
- Бюджет: ${project.budget} руб.

Требования к анализу:
1. Конкретные причины проблемы
2. Измеримые последствия (время, деньги)
3. Приоритизация по критичности
4. Реалистичные решения в рамках бюджета
`
```

### Ошибки API

| Код | Ошибка | Решение |
|-----|--------|---------|
| 401 | Unauthorized | Проверьте OPENROUTER_API_KEY |
| 429 | Too Many Requests | Подождите минуту, используйте rate limiting |
| 500 | Internal Server Error | Повторите запрос через 30 секунд |
| 503 | Service Unavailable | OpenRouter перегружен, повторите позже |

### Debugging

Включите подробное логирование AI запросов:

```typescript
// В lib/ai.ts
export async function generateAISuggestion(prompt: string, options) {
  console.log('AI Request:', {
    prompt: prompt.substring(0, 100) + '...',
    model: options?.model,
    timestamp: new Date().toISOString()
  })

  try {
    const response = await fetch(OPENROUTER_API_URL, ...)
    console.log('AI Response:', {
      status: response.status,
      tokens: response.headers.get('x-ratelimit-tokens-used')
    })
    return response
  } catch (error) {
    console.error('AI Error:', error)
    throw error
  }
}
```

## Best Practices

### 1. Кэширование результатов

Сохраняйте AI ответы в базу данных, чтобы не генерировать повторно:

```typescript
// Проверяем, есть ли уже ответ
const existing = await db.aISuggestion.findFirst({
  where: {
    projectId,
    type: 'PAIN_ANALYSIS'
  },
  orderBy: { createdAt: 'desc' }
})

if (existing && isRecent(existing.createdAt)) {
  // Используем кэшированный ответ
  return existing.suggestion
}

// Генерируем новый ответ
const suggestion = await generateAISuggestion(prompt)
await db.aISuggestion.create({
  data: { projectId, type: 'PAIN_ANALYSIS', suggestion, ... }
})
```

### 2. Retry логика

Добавьте повторные попытки при ошибках:

```typescript
async function generateWithRetry(prompt: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateAISuggestion(prompt)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(1000 * (i + 1)) // Exponential backoff
    }
  }
}
```

### 3. Валидация ответов

Проверяйте качество ответов AI:

```typescript
function validateAIResponse(response: string): boolean {
  return (
    response.length > 50 && // Минимальная длина
    response.length < 10000 && // Максимальная длина
    !response.includes('I cannot') && // AI не отказался
    !response.includes('as an AI') // AI не говорит о себе
  )
}
```

## Дальнейшее развитие

### Планируемые функции

1. **Автоматическая оценка задач** - AI будет предлагать оценку времени на задачу
2. **Генерация тест-кейсов** - автоматическое создание сценариев тестирования
3. **Анализ рисков проекта** - выявление потенциальных проблем
4. **Рекомендации по команде** - подбор специалистов под проект
5. **Генерация документации** - автоматическое создание технической документации

### Интеграции

- **Claude Chat** - прямой чат с AI для консультаций
- **Voice to Text** - голосовой ввод для описания боли клиента
- **Diagrams Generation** - автоматическая генерация диаграмм архитектуры

## Поддержка

Если у вас возникли вопросы или проблемы с AI функционалом:

1. Проверьте этот документ
2. Посмотрите примеры в коде ([lib/ai.ts](../lib/ai.ts))
3. Создайте issue в репозитории
4. Напишите в канал #ai-help в корпоративном Slack

## Ссылки

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Claude API Reference](https://docs.anthropic.com/)
- [Prisma Schema - AISuggestion](../prisma/schema.prisma)
- [AI Library Source](../lib/ai.ts)
