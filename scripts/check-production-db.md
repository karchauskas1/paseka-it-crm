# Инструкция по исправлению production ошибки на странице /clients

## Проблема

Страница www.pasekait-crm.ru/clients показывает "Application error".

Вероятная причина: база данных production не синхронизирована с последними миграциями.

## Решение 1: Применить миграции на production (РЕКОМЕНДУЕТСЯ)

### Шаг 1: Подключитесь к production серверу

```bash
ssh user@pasekait-crm.ru
# или через панель управления хостингом
```

### Шаг 2: Перейдите в директорию проекта

```bash
cd /path/to/paseka-crm
```

### Шаг 3: Примените миграции

```bash
npx prisma migrate deploy
```

Эта команда применит все pending миграции на production базе данных.

### Шаг 4: Перезапустите приложение

```bash
# Для Next.js на Vercel/Netlify - автоматически
# Для PM2:
pm2 restart paseka-crm

# Для Docker:
docker-compose restart
```

### Шаг 5: Проверьте результат

Откройте https://www.pasekait-crm.ru/clients и убедитесь, что страница загружается.

---

## Решение 2: Ручное применение SQL (если доступ к SSH ограничен)

Если у вас нет SSH доступа, но есть доступ к PostgreSQL:

### Через pgAdmin / psql / админ-панель хостинга:

```sql
-- Проверить, существует ли поле social_links
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients' AND column_name = 'social_links';

-- Если поле отсутствует, добавить его:
ALTER TABLE clients ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '[]';

-- Проверить, существует ли таблица feedbacks
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'feedbacks'
);

-- Если таблица отсутствует, создать её:
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN ('BUG', 'FEATURE', 'IMPROVEMENT')),
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  priority VARCHAR CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Решение 3: Добавить fallback в код (временное решение)

Если вы не можете применить миграции прямо сейчас, можно добавить проверки в код.

Уже применено в коде:
- ✅ [app/clients/page.tsx](app/clients/page.tsx) - проверка перед использованием socialLinks
- ✅ [app/api/clients/route.ts](app/api/clients/route.ts) - fallback на пустой массив

---

## Проверка успешного применения

После применения миграций проверьте:

1. **Страница клиентов открывается**
   ```
   https://www.pasekait-crm.ru/clients
   ```

2. **Создание клиента работает**
   - Откройте форму создания клиента
   - Заполните поля
   - Добавьте социальные сети
   - Сохраните

3. **API возвращает данные**
   ```bash
   curl https://www.pasekait-crm.ru/api/clients \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Логи для диагностики

### Где найти логи ошибок:

**Vercel:**
```
https://vercel.com/your-project/deployments
→ Click on deployment → Logs
```

**Netlify:**
```
https://app.netlify.com/sites/your-site/deploys
→ Click on deployment → Function logs
```

**PM2:**
```bash
pm2 logs paseka-crm --lines 100
```

**Docker:**
```bash
docker logs paseka-crm-container --tail 100
```

### Ищите ошибки типа:

- `column "social_links" does not exist`
- `relation "feedbacks" does not exist`
- `invalid input syntax for type json`

---

## Контакты для помощи

Если проблема не решается, предоставьте:
1. Полный текст ошибки из логов
2. Результат команды: `npx prisma migrate status`
3. Скриншот ошибки в браузере

