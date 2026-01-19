-- SQL скрипт для исправления production БД
-- Применить через Neon Dashboard SQL Editor или psql

-- 1. Проверить существующие колонки в таблице clients
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- 2. Добавить отсутствующие колонки если их нет
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- 3. Проверить таблицу users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
WHERE column_name IN ('telegram_id', 'telegram_name');

-- 4. Добавить telegram_name если отсутствует
ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_name TEXT;

-- 5. Обновить существующие записи clients, где customFields = NULL
UPDATE clients
SET custom_fields = '{}'::jsonb
WHERE custom_fields IS NULL;

-- 6. Проверить результат
SELECT
  id,
  name,
  website,
  custom_fields,
  social_links
FROM clients
LIMIT 5;

-- 7. Проверить пользователей
SELECT
  id,
  name,
  email,
  telegram_id,
  telegram_name
FROM users
LIMIT 5;
