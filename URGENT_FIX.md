# 🔴 СРОЧНОЕ ИСПРАВЛЕНИЕ: Ошибка на странице клиентов

## Проблема
```
Application error: a server-side exception has occurred while loading www.pasekait-crm.ru
Digest: 3147471532
```

Страница клиентов не открывается на production.

## Причина
На production БД не применены миграции для новых полей:
- `clients.custom_fields` (JSONB)
- `users.telegram_name` (TEXT)

## Решение

### Вариант 1: Через Neon Dashboard (БЫСТРО - 2 минуты)

1. Откройте https://console.neon.tech
2. Выберите ваш проект PASEKA IT CRM
3. Перейдите в SQL Editor
4. Скопируйте и выполните этот SQL:

```sql
-- Добавить отсутствующие колонки
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_name TEXT;

-- Обновить существующие записи
UPDATE clients
SET custom_fields = '{}'::jsonb
WHERE custom_fields IS NULL;

-- Проверка
SELECT 'clients', COUNT(*) FROM clients WHERE custom_fields IS NOT NULL
UNION ALL
SELECT 'users', COUNT(*) FROM users;
```

5. Нажмите "Run" ▶️
6. Обновите страницу www.pasekait-crm.ru/clients

### Вариант 2: Через Vercel (если есть доступ к terminal)

1. Зайдите на https://vercel.com/dashboard
2. Откройте проект PASEKA IT CRM
3. Deployments → Latest deployment → три точки ⋯ → Open Terminal
4. Выполните:

```bash
npx prisma migrate deploy
```

## Проверка

После применения SQL откройте:
- ✅ https://www.pasekait-crm.ru/clients - должна открыться без ошибки
- ✅ Создание клиента должно работать
- ✅ Админ панель → Кастомные поля должна быть доступна

## Если ошибка осталась

1. Проверьте логи Vercel:
   - https://vercel.com → Deployments → Latest → Logs
   - Найдите строку с Digest: 3147471532

2. Очистите кэш деплоя:
   - Vercel Dashboard → Deployments
   - Redeploy latest (три точки ⋯ → Redeploy)

## SQL для проверки текущего состояния БД

```sql
-- Проверить какие колонки есть в clients
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name IN ('custom_fields', 'social_links', 'website')
ORDER BY column_name;

-- Проверить users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('telegram_id', 'telegram_name')
ORDER BY column_name;
```

Ожидаемый результат:
```
custom_fields  | jsonb | YES
social_links   | jsonb | YES
website        | text  | YES
telegram_id    | text  | YES
telegram_name  | text  | YES
```

## Дополнительная информация

Полные миграции находятся в:
- `prisma/migrations/20260119164550_add_website_to_clients/migration.sql`
- `prisma/migrations/20260119165609_add_telegram_name_to_users/migration.sql`

Детальная инструкция: [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md)
