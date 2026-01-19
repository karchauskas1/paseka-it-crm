'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/layout/user-menu'
import { FeedbackButton } from '@/components/feedback'
import { NotificationBell } from '@/components/notifications/notification-bell'
import {
  Users,
  FolderKanban,
  CheckSquare,
  Bot,
  MessageSquare,
  Settings,
  Home,
  ChevronRight,
  Sparkles,
  Target,
  LayoutGrid,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react'

interface GuideClientProps {
  user: any
  workspace: any
}

const sections = [
  { id: 'getting-started', title: 'Начало работы', icon: Home },
  { id: 'clients', title: 'Клиенты', icon: Users },
  { id: 'projects', title: 'Проекты', icon: FolderKanban },
  { id: 'tasks', title: 'Задачи', icon: CheckSquare },
  { id: 'ai', title: 'AI Ассистент', icon: Bot },
  { id: 'telegram', title: 'Telegram', icon: MessageSquare },
  { id: 'admin', title: 'Администрирование', icon: Settings },
]

export default function GuideClient({ user, workspace }: GuideClientProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('getting-started')

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PASEKA IT CRM</h1>
              <p className="text-sm text-gray-600">{workspace.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <UserMenu user={user} workspace={workspace} userRole={user.role} />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/dashboard"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Dashboard
            </Link>
            <Link
              href="/projects"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Проекты
            </Link>
            <Link
              href="/clients"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Клиенты
            </Link>
            <Link
              href="/tasks"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Задачи
            </Link>
            <Link
              href="/calendar"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Календарь
            </Link>
            <Link
              href="/activity"
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Активность
            </Link>
                        <Link
              href={`/pain-radar?workspace=${workspace.id}`}
              className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-muted-foreground hover:text-foreground hover:border-border"
            >
              Pain Radar
            </Link>
{(user.role === 'ADMIN' || user.role === 'OWNER') && (
              <Link
                href="/admin"
                className="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Администрирование
              </Link>
            )}
            <Link
              href="/guide"
              className="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600"
            >
              Гайд
            </Link>
            <div className="flex-1" />
            <div className="flex items-center py-2">
              <FeedbackButton workspaceId={workspace.id} />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4">Содержание</h3>
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {section.title}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow p-8">
              {/* Getting Started */}
              {activeSection === 'getting-started' && (
                <div className="prose max-w-none">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Home className="h-6 w-6 text-blue-600" />
                    Начало работы
                  </h2>
                  <p className="text-gray-600 mb-6">
                    PASEKA IT CRM - это система управления проектами и клиентами для небольших IT-команд. Система помогает отслеживать проекты, задачи, и взаимодействие с клиентами.
                  </p>

                  <h3 className="text-lg font-semibold mb-3">Основные возможности</h3>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Управление клиентами и контактами</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Ведение проектов с этапами и архитектурой</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Kanban-доска для задач</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>AI-ассистент для анализа и генерации</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Уведомления в Telegram</span>
                    </li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-3">Быстрый старт</h3>
                  <ol className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                      <span>Создайте клиента в разделе "Клиенты"</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                      <span>Создайте проект и привяжите к клиенту</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                      <span>Опишите "боль" клиента - проблему которую решаете</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
                      <span>Используйте AI для генерации архитектуры решения</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">5</span>
                      <span>Создайте задачи и распределите их по этапам</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Clients */}
              {activeSection === 'clients' && (
                <div className="prose max-w-none">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    Клиенты
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Раздел "Клиенты" позволяет вести базу контактов и компаний с которыми вы работаете.
                  </p>

                  <h3 className="text-lg font-semibold mb-3">Поля клиента</h3>
                  <ul className="space-y-2 mb-6">
                    <li><strong>Имя</strong> - имя контактного лица</li>
                    <li><strong>Компания</strong> - название организации</li>
                    <li><strong>Email</strong> - электронная почта</li>
                    <li><strong>Телефон</strong> - контактный телефон</li>
                    <li><strong>Источник</strong> - откуда пришёл клиент</li>
                    <li><strong>Заметки</strong> - дополнительная информация</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-3">Источники клиентов</h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <span className="font-medium text-orange-700">WARM</span>
                      <p className="text-sm text-gray-600">Тёплый контакт</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-700">COLD</span>
                      <p className="text-sm text-gray-600">Холодный контакт</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <span className="font-medium text-green-700">REFERRAL</span>
                      <p className="text-sm text-gray-600">По рекомендации</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium text-purple-700">WEBSITE</span>
                      <p className="text-sm text-gray-600">С сайта</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Projects */}
              {activeSection === 'projects' && (
                <div className="prose max-w-none">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FolderKanban className="h-6 w-6 text-blue-600" />
                    Проекты
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Проекты - это основная сущность системы. Каждый проект связан с клиентом и содержит всю информацию о работе.
                  </p>

                  <h3 className="text-lg font-semibold mb-3">Типы проектов</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Sparkles className="h-5 w-5 text-green-600" />
                      <div>
                        <span className="font-medium text-green-700">MONEY</span>
                        <p className="text-sm text-gray-600">Коммерческий проект</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Target className="h-5 w-5 text-blue-600" />
                      <div>
                        <span className="font-medium text-blue-700">STRATEGIC</span>
                        <p className="text-sm text-gray-600">Стратегический проект</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <LayoutGrid className="h-5 w-5 text-purple-600" />
                      <div>
                        <span className="font-medium text-purple-700">INTERNAL</span>
                        <p className="text-sm text-gray-600">Внутренний проект</p>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-3">Статусы проектов</h3>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                      <span><strong>LEAD</strong> - Лид, первичный контакт</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                      <span><strong>NEGOTIATION</strong> - Переговоры</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                      <span><strong>IN_PROGRESS</strong> - В работе</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                      <span><strong>REVIEW</strong> - На проверке</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-400"></span>
                      <span><strong>COMPLETED</strong> - Завершён</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-400"></span>
                      <span><strong>ON_HOLD</strong> - Приостановлен</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-3">Вкладки проекта</h3>
                  <ul className="space-y-2 mb-6">
                    <li><strong>Боль</strong> - описание проблемы клиента и контекст</li>
                    <li><strong>Архитектура</strong> - версии архитектурных решений</li>
                    <li><strong>Этапы</strong> - milestones проекта</li>
                    <li><strong>Задачи</strong> - список задач</li>
                    <li><strong>Документы</strong> - файлы и материалы</li>
                    <li><strong>Комментарии</strong> - обсуждения по проекту</li>
                  </ul>
                </div>
              )}

              {/* Tasks */}
              {activeSection === 'tasks' && (
                <div className="prose max-w-none">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckSquare className="h-6 w-6 text-blue-600" />
                    Задачи
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Задачи помогают отслеживать работу по проектам. Доступны два представления: таблица и Kanban-доска.
                  </p>

                  <h3 className="text-lg font-semibold mb-3">Статусы задач</h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <span className="font-medium">TODO</span>
                      <p className="text-sm text-gray-600">К выполнению</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <span className="font-medium text-blue-700">IN_PROGRESS</span>
                      <p className="text-sm text-gray-600">В работе</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <span className="font-medium text-purple-700">IN_REVIEW</span>
                      <p className="text-sm text-gray-600">На проверке</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <span className="font-medium text-green-700">COMPLETED</span>
                      <p className="text-sm text-gray-600">Выполнено</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-3">Приоритеты</h3>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span><strong>URGENT</strong> - Срочно</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span><strong>HIGH</strong> - Высокий</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span><strong>MEDIUM</strong> - Средний</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-gray-400" />
                      <span><strong>LOW</strong> - Низкий</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-3">Kanban-доска</h3>
                  <p className="text-gray-600 mb-4">
                    На Kanban-доске задачи отображаются в колонках по статусам. Перетаскивайте карточки между колонками для изменения статуса.
                  </p>
                </div>
              )}

              {/* AI */}
              {activeSection === 'ai' && (
                <div className="prose max-w-none">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Bot className="h-6 w-6 text-blue-600" />
                    AI Ассистент
                  </h2>
                  <p className="text-gray-600 mb-6">
                    AI ассистент использует OpenRouter API для анализа проектов и генерации решений.
                  </p>

                  <h3 className="text-lg font-semibold mb-3">Возможности AI</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Анализ боли</strong>
                        <p className="text-sm text-gray-600">AI анализирует описание проблемы клиента и предлагает подходы к решению</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Генерация архитектуры</strong>
                        <p className="text-sm text-gray-600">На основе боли AI генерирует предложение по архитектуре решения</p>
                      </div>
                    </li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-3">Настройка</h3>
                  <ol className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                      <span>Зарегистрируйтесь на openrouter.ai</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                      <span>Получите API ключ</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                      <span>Введите ключ в Администрирование → Интеграции</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* Telegram */}
              {activeSection === 'telegram' && (
                <div className="prose max-w-none">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    Telegram уведомления
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Система может отправлять уведомления о важных событиях в Telegram чат или группу.
                  </p>

                  <h3 className="text-lg font-semibold mb-3">Настройка бота</h3>
                  <ol className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
                      <span>Найдите @BotFather в Telegram</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
                      <span>Отправьте команду /newbot</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
                      <span>Следуйте инструкциям и получите токен бота</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
                      <span>Добавьте бота в группу или начните диалог</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">5</span>
                      <span>Получите Chat ID (через @userinfobot или API)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">6</span>
                      <span>Введите токен и Chat ID в настройках</span>
                    </li>
                  </ol>

                  <h3 className="text-lg font-semibold mb-3">Типы уведомлений</h3>
                  <ul className="space-y-2 mb-6">
                    <li>Создание нового проекта</li>
                    <li>Изменение статуса проекта</li>
                    <li>Создание задачи</li>
                    <li>Завершение задачи</li>
                    <li>Добавление комментария</li>
                  </ul>
                </div>
              )}

              {/* Admin */}
              {activeSection === 'admin' && (
                <div className="prose max-w-none">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="h-6 w-6 text-blue-600" />
                    Администрирование
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Раздел администрирования доступен только пользователям с ролью ADMIN.
                  </p>

                  <h3 className="text-lg font-semibold mb-3">Управление пользователями</h3>
                  <ul className="space-y-2 mb-6">
                    <li>Просмотр списка пользователей workspace</li>
                    <li>Добавление новых пользователей</li>
                    <li>Изменение ролей (ADMIN / MEMBER)</li>
                    <li>Удаление пользователей</li>
                  </ul>

                  <h3 className="text-lg font-semibold mb-3">Роли</h3>
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-700">ADMIN</span>
                      <p className="text-sm text-gray-600">Полный доступ: управление пользователями, настройками, интеграциями</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">MEMBER</span>
                      <p className="text-sm text-gray-600">Работа с проектами, клиентами и задачами</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-3">Настройки workspace</h3>
                  <ul className="space-y-2 mb-6">
                    <li>Название workspace</li>
                    <li>Интеграция с Telegram</li>
                    <li>Интеграция с OpenRouter AI</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
