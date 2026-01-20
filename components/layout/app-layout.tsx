'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserMenu } from './user-menu'
import { NotificationBell } from '@/components/notifications/notification-bell'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  Phone,
  Calendar,
  Activity,
  Radar,
  Settings,
  BookOpen,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  user: any
  workspace: any
  currentPage?: string
  userRole?: string
  children: React.ReactNode
}

export function AppLayout({ user, workspace, currentPage, userRole, children }: AppLayoutProps) {
  const pathname = usePathname()
  const [navLayout, setNavLayout] = useState<'top' | 'sidebar'>('top')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Safety check for workspace
  const workspaceName = workspace?.name || 'Workspace'

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/projects', label: 'Проекты', icon: FolderKanban },
    { href: '/clients', label: 'Клиенты', icon: Users },
    { href: '/tasks', label: 'Задачи', icon: CheckSquare },
    { href: '/touches', label: 'Касания', icon: Phone },
    { href: '/calendar', label: 'Календарь', icon: Calendar },
    { href: '/activity', label: 'Активность', icon: Activity },
    { href: '/pain-radar', label: 'Pain Radar', icon: Radar },
  ]

  const effectiveRole = userRole || user.role
  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER'

  useEffect(() => {
    setMounted(true)

    // Check mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Load saved nav layout
    const savedLayout = localStorage.getItem('navLayout') as 'top' | 'sidebar' | null
    if (savedLayout) {
      setNavLayout(savedLayout)
    }

    // Listen for nav layout changes from UserMenu
    const handleNavLayoutChange = (event: CustomEvent) => {
      setNavLayout(event.detail)
    }
    window.addEventListener('navLayoutChange', handleNavLayoutChange as EventListener)

    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('navLayoutChange', handleNavLayoutChange as EventListener)
    }
  }, [])

  const activePath = currentPage || pathname

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    )
  }

  // Top Navigation Layout
  if (navLayout === 'top') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">PASEKA IT CRM</h1>
                <p className="text-sm text-muted-foreground">{workspaceName}</p>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <UserMenu user={user} workspace={workspace} userRole={user.role} />
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-card border-b sticky top-[73px] z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-1.5 transition-colors',
                    activePath === item.href
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  className={cn(
                    'py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-1.5 transition-colors',
                    activePath === '/admin'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  )}
                >
                  <Settings className="h-4 w-4" />
                  Админ
                </Link>
              )}
              <Link
                href="/guide"
                className={cn(
                  'py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-1.5 transition-colors',
                  activePath === '/guide'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <BookOpen className="h-4 w-4" />
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

  // Sidebar Layout
  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-card border-r z-50 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16',
          isMobile && !sidebarOpen && '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-foreground truncate">PASEKA IT CRM</h1>
              <p className="text-xs text-muted-foreground truncate">{workspaceName}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                activePath === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          ))}

          <div className="my-2 border-t" />

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                activePath === '/admin'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              title={!sidebarOpen ? 'Администрирование' : undefined}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span className="truncate">Администрирование</span>}
            </Link>
          )}

          <Link
            href="/guide"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              activePath === '/guide'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
            title={!sidebarOpen ? 'Гайд' : undefined}
          >
            <BookOpen className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span className="truncate">Гайд</span>}
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        'flex-1 transition-all duration-300',
        sidebarOpen ? 'ml-64' : 'ml-16',
        isMobile && 'ml-0'
      )}>
        {/* Top Header */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-4 sticky top-0 z-30">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className={cn(isMobile ? 'flex-1 text-center' : '')}>
            {isMobile && (
              <h1 className="text-lg font-bold text-foreground">PASEKA IT CRM</h1>
            )}
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <UserMenu user={user} workspace={workspace} userRole={user.role} />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
