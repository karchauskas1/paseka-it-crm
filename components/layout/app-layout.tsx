'use client'

import Link from 'next/link'
import { UserMenu } from './user-menu'

interface AppLayoutProps {
  user: any
  workspace: any
  currentPage: string
  children: React.ReactNode
}

export function AppLayout({ user, workspace, currentPage, children }: AppLayoutProps) {
  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/projects', label: 'Проекты' },
    { href: '/clients', label: 'Клиенты' },
    { href: '/tasks', label: 'Задачи' },
    { href: '/calendar', label: 'Календарь' },
    { href: '/activity', label: 'Активность' },
  ]

  const isAdmin = user.role === 'ADMIN' || user.role === 'OWNER'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">PASEKA IT CRM</h1>
              <p className="text-sm text-muted-foreground">{workspace.name}</p>
            </div>
            <UserMenu user={user} workspace={workspace} userRole={user.role} />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentPage === item.href
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentPage === '/admin'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Администрирование
              </Link>
            )}
            <Link
              href="/guide"
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                currentPage === '/guide'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Гайд
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
