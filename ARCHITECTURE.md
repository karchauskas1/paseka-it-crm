# Архитектура PASEKA IT CRM

## Технологический стек

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.7
- **UI Library**: React 19
- **Styling**: Tailwind CSS 3.4 + shadcn/ui
- **State Management**: TanStack Query (React Query) + Zustand
- **Forms**: React Hook Form + Zod
- **Data Grid**: TanStack Table

### Backend
- **Runtime**: Node.js 22
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL 16
- **ORM**: Prisma 6
- **Authentication**: JWT (jose library)
- **Password Hashing**: bcryptjs

### Интеграции
- **AI**: OpenRouter API (Claude Opus 4.5)
- **Notifications**: Telegram Bot API

### Deployment
- **Hosting**: Vercel (рекомендуется)
- **Database**: PostgreSQL (Neon, Supabase, Railway)

---

## Структура проекта

```
PASEKA IT CRM/
├── app/                          # Next.js App Router
│   ├── api/                     # API Routes
│   │   ├── auth/               # Авторизация
│   │   │   ├── login/          # POST /api/auth/login
│   │   │   ├── register/       # POST /api/auth/register
│   │   │   └── logout/         # POST /api/auth/logout
│   │   ├── projects/           # Проекты
│   │   │   ├── route.ts        # GET/POST /api/projects
│   │   │   └── [id]/           # GET/PATCH/DELETE /api/projects/:id
│   │   ├── clients/            # Клиенты
│   │   │   └── route.ts        # GET/POST /api/clients
│   │   ├── tasks/              # Задачи
│   │   │   └── route.ts        # GET/POST /api/tasks
│   │   └── ai/                 # AI endpoints
│   │       └── suggestions/    # POST /api/ai/suggestions
│   ├── dashboard/              # Dashboard страница
│   │   ├── page.tsx           # Server Component
│   │   └── dashboard-client.tsx # Client Component
│   ├── projects/               # Страницы проектов
│   │   ├── page.tsx           # Список проектов
│   │   ├── projects-client.tsx # Client компонент
│   │   └── [id]/              # Детальная страница проекта
│   ├── login/                  # Страница входа
│   ├── layout.tsx              # Root layout
│   ├── providers.tsx           # React Query provider
│   └── globals.css             # Глобальные стили
│
├── components/                  # React компоненты
│   └── ui/                     # shadcn/ui компоненты
│       ├── button.tsx
│       ├── input.tsx
│       └── card.tsx
│
├── lib/                         # Утилиты и библиотеки
│   ├── db.ts                   # Prisma Client
│   ├── auth.ts                 # JWT авторизация
│   ├── ai.ts                   # OpenRouter интеграция
│   ├── telegram.ts             # Telegram Bot
│   └── utils.ts                # Helper функции
│
├── prisma/
│   └── schema.prisma           # Database schema
│
├── public/                      # Статические файлы
│
├── .env                        # Environment variables
├── .env.example               # Environment template
├── next.config.ts             # Next.js конфигурация
├── tailwind.config.ts         # Tailwind конфигурация
├── tsconfig.json              # TypeScript конфигурация
├── package.json               # Dependencies
│
├── README.md                  # Полная документация
├── QUICKSTART.md              # Быстрый старт
├── START.md                   # Пошаговая инструкция
├── ARCHITECTURE.md            # Этот файл
└── setup.sh                   # Скрипт установки
```

---

## Архитектура базы данных

### Основные модели

#### User
Пользователи системы с ролями и правами доступа.
```prisma
- id: UUID (PK)
- email: String (unique)
- password: String (hashed)
- name: String
- role: UserRole (OWNER/ADMIN/MEMBER/VIEWER)
- telegramId: String? (для уведомлений)
```

#### Workspace
Рабочие пространства (мультитенантность).
```prisma
- id: UUID (PK)
- name: String
- description: String?
- members: WorkspaceMember[]
```

#### Client
Клиенты компании.
```prisma
- id: UUID (PK)
- name: String
- company: String?
- email: String?
- phone: String?
- source: ClientSource (WARM/COLD/REFERRAL...)
- status: ClientStatus (ACTIVE/INACTIVE/ARCHIVED)
- customFields: JSON (гибкие поля)
```

#### Project
Ключевая сущность - проекты.
```prisma
- id: UUID (PK)
- clientId: UUID (FK)
- name: String
- type: ProjectType (MONEY/GROWTH/INVESTMENT)
- status: ProjectStatus (LEAD/QUALIFICATION/BRIEFING...)
- priority: Priority (LOW/MEDIUM/HIGH/URGENT)

# Боль и контекст
- pain: String?
- context: String?
- whyProblem: String?
- consequences: String?

# Задачи и цели
- goals: String?
- expectedResult: String?
- successCriteria: String?

# Архитектура
- architectureVersions: ArchitectureVersion[]

# Финансы
- budget: Float?
- revenue: Float?
- currency: String

# Даты
- startDate: DateTime?
- endDatePlan: DateTime?
- endDateFact: DateTime?

# Решения
- keyDecision: String?
- decisionReason: String?

# Гостевой доступ
- guestToken: String? (unique)
- guestAccess: Boolean

# Связи
- tasks: Task[]
- milestones: Milestone[]
- documents: Document[]
- comments: Comment[]
- activities: Activity[]
```

#### ArchitectureVersion
Версионирование архитектурных решений.
```prisma
- id: UUID (PK)
- projectId: UUID (FK)
- version: Int
- title: String
- description: String?
- solution: String?
- hypotheses: String?
- constraints: String?
- comments: String?
```

#### Task
Задачи проекта (внутренние).
```prisma
- id: UUID (PK)
- projectId: UUID? (FK)
- title: String
- description: String?
- status: TaskStatus (TODO/IN_PROGRESS/COMPLETED...)
- priority: Priority
- complexity: TaskComplexity (S/M/L/XL)
- estimatedHours: Float?
- actualHours: Float?
- dueDate: DateTime?
- assigneeId: UUID? (FK)
- subtasks: Task[] (иерархия)
```

#### AISuggestion
История AI предложений.
```prisma
- id: UUID (PK)
- projectId: UUID? (FK)
- fieldType: String
- fieldId: String
- context: JSON
- suggestions: JSON
- confidence: Float
- userId: UUID (FK)
```

#### Activity
Лог всех действий в системе.
```prisma
- id: UUID (PK)
- type: ActivityType (CREATE/UPDATE/DELETE...)
- entityType: String
- entityId: String
- action: String
- oldValue: JSON?
- newValue: JSON?
- userId: UUID (FK)
```

---

## Архитектура API

### REST API структура

#### Authentication
```
POST /api/auth/register    - Регистрация
POST /api/auth/login       - Вход
POST /api/auth/logout      - Выход
```

#### Projects
```
GET    /api/projects           - Список проектов
POST   /api/projects           - Создать проект
GET    /api/projects/:id       - Детали проекта
PATCH  /api/projects/:id       - Обновить проект
DELETE /api/projects/:id       - Удалить проект
```

#### Clients
```
GET    /api/clients           - Список клиентов
POST   /api/clients           - Создать клиента
GET    /api/clients/:id       - Детали клиента
PATCH  /api/clients/:id       - Обновить клиента
DELETE /api/clients/:id       - Удалить клиента
```

#### Tasks
```
GET    /api/tasks            - Список задач
POST   /api/tasks            - Создать задачу
GET    /api/tasks/:id        - Детали задачи
PATCH  /api/tasks/:id        - Обновить задачу
DELETE /api/tasks/:id        - Удалить задачу
```

#### AI Suggestions
```
POST /api/ai/suggestions
Body: {
  type: 'field' | 'pain-analysis' | 'architecture',
  projectId?: string,
  context: {
    // Контекст для AI
  }
}
```

### Авторизация

**JWT-based authentication:**
- Cookie: `session` (httpOnly, secure in production)
- Expires: 7 дней
- Payload: `{ userId, email, role }`

**Middleware:** `getCurrentUser()` для получения текущего пользователя

---

## Поток данных

### 1. Аутентификация
```
User → Login Form → POST /api/auth/login
                   ↓
              Verify Password
                   ↓
              Create JWT Token
                   ↓
              Set Cookie
                   ↓
              Redirect to /dashboard
```

### 2. Загрузка проектов
```
Dashboard Page (Server) → db.project.findMany()
                        ↓
                  Fetch projects + metrics
                        ↓
                  Pass to Client Component
                        ↓
                  Render UI
```

### 3. AI Анализ боли
```
Project Page → Click "Анализ AI"
            ↓
     POST /api/ai/suggestions
            ↓
     OpenRouter API (Claude)
            ↓
     Parse response
            ↓
     Save to db.aiSuggestion
            ↓
     Return suggestions
            ↓
     Display in UI
```

### 4. Telegram уведомления
```
Project Status Change → PATCH /api/projects/:id
                      ↓
                Log activity in db
                      ↓
           Check user has telegramId
                      ↓
        Call notifyProjectStatusChange()
                      ↓
           Telegram Bot API sendMessage
                      ↓
          User receives notification
```

---

## Безопасность

### Аутентификация
- JWT токены с httpOnly cookies
- Password hashing с bcryptjs (10 rounds)
- Session expiry: 7 дней

### Авторизация
- Role-based access control (RBAC)
- Workspace-level permissions
- Guest access с уникальными токенами

### Database
- Prisma ORM предотвращает SQL injection
- Cascade deletes для целостности данных
- Индексы для производительности

### API Security
- Все API routes защищены `getCurrentUser()`
- Validate input с Zod schemas
- Rate limiting (рекомендуется добавить в production)

---

## Масштабирование

### Горизонтальное масштабирование
- Stateless Next.js серверы
- Session в JWT (не в памяти)
- Database на отдельном сервере

### Кэширование
- React Query для client-side кэширования
- Prisma connection pooling
- Опционально: Redis для session storage

### Оптимизация запросов
- Prisma `include` только нужных связей
- Pagination для больших списков
- Индексы на часто используемых полях

---

## AI Интеграция

### OpenRouter API
**Используемая модель:** Claude Opus 4.5 (`anthropic/claude-opus-4-5`)

**Функции:**
1. **Анализ боли клиента** (`analyzePain`)
   - Input: описание боли
   - Output: причины, последствия, решения

2. **Генерация архитектуры** (`generateArchitectureSuggestions`)
   - Input: боль + цели
   - Output: подход, компоненты, tech stack, риски

3. **Автодополнение полей** (`generateSuggestions`)
   - Input: текущее значение + контекст
   - Output: 3-5 вариантов

4. **Project Insights** (`generateProjectInsights`)
   - Input: данные проекта
   - Output: анализ прогресса, риски, рекомендации

### Debouncing и оптимизация
- Debounce 500ms для автодополнения
- Background processing для heavy operations
- Кэширование suggestions в БД

---

## Telegram Bot

### Типы уведомлений
1. **Project Status Change** - изменение статуса проекта
2. **Task Assigned** - назначение задачи
3. **Task Due Soon** - напоминание о дедлайне
4. **New Comment** - новый комментарий
5. **Project Deadline** - приближение дедлайна проекта

### Настройка
1. Создать бота через @BotFather
2. Получить token
3. Добавить в `.env`: `TELEGRAM_BOT_TOKEN`
4. Пользователь получает свой ID от бота
5. Добавляет ID в профиль CRM

---

## Будущие улучшения

### Phase 2 (Kanban, Calendar, Gantt views)
- [ ] Kanban Board с drag & drop
- [ ] Calendar view для дедлайнов
- [ ] Gantt chart для timeline
- [ ] Переключение views без потери state

### Phase 3 (Расширенные функции)
- [ ] File uploads (S3/Cloudflare R2)
- [ ] Document versioning
- [ ] Email integration
- [ ] Webhooks для внешних интеграций
- [ ] API tokens для third-party apps

### Phase 4 (Analytics & Reporting)
- [ ] Project analytics dashboard
- [ ] Time tracking
- [ ] Revenue forecasting
- [ ] Export reports (PDF, Excel)
- [ ] Custom dashboards

### Phase 5 (Collaboration)
- [ ] Real-time updates (WebSocket)
- [ ] @mentions в комментариях
- [ ] Activity feed
- [ ] Notifications center в UI

---

## Performance Considerations

### Current optimizations
- Server Components где возможно
- React Query для кэширования
- Prisma connection pooling
- Optimized indexes в БД

### Рекомендации для production
- CDN для статики (Vercel автоматически)
- Image optimization (Next.js Image)
- Database read replicas
- Redis для сессий
- Monitoring (Sentry, LogRocket)

---

## Development Workflow

### Local Development
```bash
npm run dev          # Start dev server
npm run db:studio    # Open Prisma Studio
npm run db:push      # Update database schema
```

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run db:push`
3. Run `npm run db:generate`

### Adding new API endpoint
1. Create `app/api/[route]/route.ts`
2. Add authentication check
3. Implement GET/POST/PATCH/DELETE handlers
4. Add error handling

### Adding new page
1. Create `app/[route]/page.tsx` (Server Component)
2. Create `app/[route]/[route]-client.tsx` (Client Component)
3. Fetch data in Server Component
4. Pass to Client Component as props

---

## Deployment

### Vercel (рекомендуется)
1. Push код в Git repository
2. Import project в Vercel
3. Add environment variables
4. Deploy

### Environment Variables для Production
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<сгенерированный-ключ>
OPENROUTER_API_KEY=sk-or-v1-...
TELEGRAM_BOT_TOKEN=...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Database для Production
- **Neon** - serverless PostgreSQL
- **Supabase** - PostgreSQL + дополнительные фичи
- **Railway** - PostgreSQL + Redis

---

## Мониторинг и логирование

### Рекомендуемые инструменты
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Vercel Analytics** - Performance metrics
- **PostgreSQL logs** - Database monitoring

### Metrics для отслеживания
- API response times
- Database query performance
- Error rates
- User engagement
- AI API costs

---

## Заключение

PASEKA IT CRM построена на современных технологиях с фокусом на:
- **Гибкость** - легко добавлять новые функции
- **Производительность** - оптимизированные запросы и кэширование
- **Масштабируемость** - готова к росту
- **UX** - простой и интуитивный интерфейс
- **AI-first** - AI интегрирован в core workflows

Архитектура позволяет легко расширять систему и добавлять новые модули.
