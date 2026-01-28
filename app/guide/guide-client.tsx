'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout'
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
    <AppLayout user={user} workspace={workspace} currentPage="/guide" userRole={user.role}>
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Mobile Navigation */}
          <div className="lg:hidden">
            <div className="bg-card rounded-lg shadow p-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap touch-manipulation ${
                        activeSection === section.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {section.title}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-card rounded-lg shadow p-4 sticky top-8">
              <h3 className="font-semibold text-foreground mb-4">Содержание</h3>
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'text-muted-foreground hover:bg-muted'
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
          <div className="flex-1 min-w-0">
            <div className="bg-card rounded-lg shadow p-4 sm:p-8">
              {/* Getting Started */}
              {activeSection === 'getting-started' && (
                <div className="prose max-w-none">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Home className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    Начало работы
                  </h2>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base">
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
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    Клиенты
                  </h2>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base">
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

                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Источники клиентов</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6">
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <span className="font-medium text-orange-700">WARM</span>
                      <p className="text-sm text-muted-foreground">Тёплый контакт</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-blue-700">COLD</span>
                      <p className="text-sm text-muted-foreground">Холодный контакт</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <span className="font-medium text-green-700">REFERRAL</span>
                      <p className="text-sm text-muted-foreground">По рекомендации</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium text-purple-700">WEBSITE</span>
                      <p className="text-sm text-muted-foreground">С сайта</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Projects */}
              {activeSection === 'projects' && (
                <div className="prose max-w-none">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    Проекты
                  </h2>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                    Проекты - это основная сущность системы. Каждый проект связан с клиентом и содержит всю информацию о работе.
                  </p>

                  <h3 className="text-lg font-semibold mb-3">Типы проектов</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Sparkles className="h-5 w-5 text-green-600" />
                      <div>
                        <span className="font-medium text-green-700">MONEY</span>
                        <p className="text-sm text-muted-foreground">Коммерческий проект</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Target className="h-5 w-5 text-blue-600" />
                      <div>
                        <span className="font-medium text-blue-700">STRATEGIC</span>
                        <p className="text-sm text-muted-foreground">Стратегический проект</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <LayoutGrid className="h-5 w-5 text-purple-600" />
                      <div>
                        <span className="font-medium text-purple-700">INTERNAL</span>
                        <p className="text-sm text-muted-foreground">Внутренний проект</p>
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
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    Задачи
                  </h2>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                    Задачи помогают отслеживать работу по проектам. Доступны два представления: таблица и Kanban-доска.
                  </p>

                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Статусы задач</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6">
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="font-medium">TODO</span>
                      <p className="text-sm text-muted-foreground">К выполнению</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <span className="font-medium text-blue-700">IN_PROGRESS</span>
                      <p className="text-sm text-muted-foreground">В работе</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <span className="font-medium text-purple-700">IN_REVIEW</span>
                      <p className="text-sm text-muted-foreground">На проверке</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <span className="font-medium text-green-700">COMPLETED</span>
                      <p className="text-sm text-muted-foreground">Выполнено</p>
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
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span><strong>LOW</strong> - Низкий</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-3">Kanban-доска</h3>
                  <p className="text-muted-foreground mb-4">
                    На Kanban-доске задачи отображаются в колонках по статусам. Перетаскивайте карточки между колонками для изменения статуса.
                  </p>
                </div>
              )}

              {/* AI */}
              {activeSection === 'ai' && (
                <div className="prose max-w-none">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    AI Ассистент
                  </h2>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                    AI ассистент использует OpenRouter API для анализа проектов и генерации решений.
                  </p>

                  <h3 className="text-lg font-semibold mb-3">Возможности AI</h3>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Анализ боли</strong>
                        <p className="text-sm text-muted-foreground">AI анализирует описание проблемы клиента и предлагает подходы к решению</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <FileText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Генерация архитектуры</strong>
                        <p className="text-sm text-muted-foreground">На основе боли AI генерирует предложение по архитектуре решения</p>
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
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    Telegram уведомления
                  </h2>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base">
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
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    Администрирование
                  </h2>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base">
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
                      <p className="text-sm text-muted-foreground">Полный доступ: управление пользователями, настройками, интеграциями</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="font-medium text-foreground">MEMBER</span>
                      <p className="text-sm text-muted-foreground">Работа с проектами, клиентами и задачами</p>
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
    </AppLayout>
  )
}
