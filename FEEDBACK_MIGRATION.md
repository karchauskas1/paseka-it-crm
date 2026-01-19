# Миграция таблицы Feedback на Production

## Проблема
Страница `/feedback` выдает ошибку на production, потому что в базе данных отсутствует таблица `feedback`.

## Решение
Нужно применить SQL скрипт для создания таблицы и необходимых enum типов.

## Шаги

### 1. Откройте Neon Console
- Перейдите на https://console.neon.tech
- Выберите проект `PASEKA_IT_CRM_DATABASE`
- Откройте SQL Editor

### 2. Выполните SQL скрипт
Скопируйте и выполните содержимое файла `scripts/add-feedback-table.sql`:

```sql
-- Создаем enum для типа feedback (если еще не существует)
DO $$ BEGIN
    CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'FEATURE', 'IMPROVEMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Создаем enum для статуса feedback (если еще не существует)
DO $$ BEGIN
    CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Создаем таблицу feedback (если еще не существует)
CREATE TABLE IF NOT EXISTS "feedback" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "screenshot" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Priority",
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- Создаем индексы (если еще не существуют)
CREATE INDEX IF NOT EXISTS "feedback_workspace_id_idx" ON "feedback"("workspace_id");
CREATE INDEX IF NOT EXISTS "feedback_status_idx" ON "feedback"("status");
CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "feedback"("created_at");

-- Добавляем foreign keys (если еще не существуют)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feedback_workspace_id_fkey'
    ) THEN
        ALTER TABLE "feedback" ADD CONSTRAINT "feedback_workspace_id_fkey"
        FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'feedback_created_by_id_fkey'
    ) THEN
        ALTER TABLE "feedback" ADD CONSTRAINT "feedback_created_by_id_fkey"
        FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Проверяем результат
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'feedback'
ORDER BY ordinal_position;
```

### 3. Проверьте результат
После выполнения скрипта вы должны увидеть список колонок таблицы `feedback`:
- id
- workspace_id
- type
- title
- description
- screenshot
- status
- priority
- created_by_id
- created_at
- updated_at

### 4. Проверьте сайт
Откройте https://www.pasekait-crm.ru/feedback - страница должна загрузиться без ошибок.

## Примечания
- Скрипт безопасен для повторного выполнения (использует `IF NOT EXISTS`)
- Все изменения автоматически применяются к production базе данных
- Редеплой Vercel не требуется - изменения только в базе данных
