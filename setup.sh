#!/bin/bash

# PASEKA IT CRM - Setup Script
# Автоматическая установка и настройка CRM системы

echo "🚀 Добро пожаловать в установку PASEKA IT CRM!"
echo ""

# Проверка Node.js
echo "📦 Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js 18+ с https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Требуется Node.js 18+. Текущая версия: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) установлен"
echo ""

# Проверка PostgreSQL
echo "🐘 Проверка PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL не найден"
    echo "Установите PostgreSQL:"
    echo "  macOS: brew install postgresql@16"
    echo "  Ubuntu: sudo apt-get install postgresql"
    echo "  Windows: https://www.postgresql.org/download/"
    read -p "Продолжить без проверки PostgreSQL? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ PostgreSQL установлен"
fi
echo ""

# Установка зависимостей
echo "📦 Установка зависимостей..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при установке зависимостей"
    exit 1
fi
echo "✅ Зависимости установлены"
echo ""

# Проверка .env файла
echo "⚙️  Проверка конфигурации..."
if [ ! -f ".env" ]; then
    echo "📝 Создаём .env файл..."
    cp .env.example .env
    echo "✅ .env файл создан"
    echo ""
    echo "⚠️  ВАЖНО: Отредактируйте .env файл и укажите:"
    echo "   - DATABASE_URL (строка подключения к PostgreSQL)"
    echo "   - JWT_SECRET (сгенерируйте: openssl rand -base64 32)"
    echo "   - OPENROUTER_API_KEY (опционально, для AI)"
    echo "   - TELEGRAM_BOT_TOKEN (опционально, для уведомлений)"
    echo ""
    read -p "Нажмите Enter когда отредактируете .env файл..."
else
    echo "✅ .env файл существует"
fi
echo ""

# Проверка DATABASE_URL
if ! grep -q "DATABASE_URL=" .env; then
    echo "❌ DATABASE_URL не найден в .env файле"
    exit 1
fi

# Настройка базы данных
echo "🗄️  Настройка базы данных..."
echo "Применяем схему Prisma к базе данных..."
npm run db:push
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при настройке базы данных"
    echo ""
    echo "Возможные причины:"
    echo "  1. PostgreSQL не запущен"
    echo "  2. Неверный DATABASE_URL в .env"
    echo "  3. База данных не создана"
    echo ""
    echo "Попробуйте:"
    echo "  1. Запустите PostgreSQL"
    echo "  2. Создайте базу данных: createdb paseka_crm"
    echo "  3. Проверьте DATABASE_URL в .env"
    exit 1
fi

echo "Генерируем Prisma Client..."
npm run db:generate
if [ $? -ne 0 ]; then
    echo "❌ Ошибка при генерации Prisma Client"
    exit 1
fi

echo "✅ База данных настроена"
echo ""

# Финальное сообщение
echo "🎉 Установка завершена успешно!"
echo ""
echo "Для запуска CRM выполните:"
echo "  npm run dev"
echo ""
echo "Затем откройте в браузере:"
echo "  http://localhost:3000"
echo ""
echo "📚 Документация:"
echo "  - START.md - Пошаговая инструкция по первому запуску"
echo "  - README.md - Полная документация"
echo "  - QUICKSTART.md - Быстрый старт"
echo ""
echo "Хотите запустить сейчас? (y/n)"
read -p "" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Запускаем CRM..."
    npm run dev
fi
