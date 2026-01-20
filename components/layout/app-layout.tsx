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
  Sparkles,
  MoreHorizontal,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { migrateUserSettings } from '@/lib/utils/migrate-settings'

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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  // Safety check for workspace
  const workspaceName = workspace?.name || 'Workspace'

  // All navigation items
  const allNavItems = [
    { href: '/dashboard', label: 'Главная', icon: Home, mobileLabel: 'Главная' },
    { href: '/projects', label: 'Проекты', icon: FolderKanban, mobileLabel: 'Проекты' },
    { href: '/clients', label: 'Клиенты', icon: Users, mobileLabel: 'Клиенты' },
    { href: '/tasks', label: 'Задачи', icon: CheckSquare, mobileLabel: 'Задачи' },
    { href: '/touches', label: 'Касания', icon: Phone, mobileLabel: 'Касания' },
    { href: '/calendar', label: 'Календарь', icon: Calendar, mobileLabel: 'Календарь' },
    { href: '/activity', label: 'Активность', icon: Activity, mobileLabel: 'Активность' },
    { href: '/pain-radar', label: 'Pain Radar', icon: Radar, mobileLabel: 'Radar' },
    { href: '/ai-chat', label: 'AI Чат', icon: Sparkles, mobileLabel: 'AI' },
  ]

  // Items for bottom mobile nav (first 4 + More)
  const mobileNavItems = allNavItems.slice(0, 4)
  const moreNavItems = allNavItems.slice(4)

  const effectiveRole = userRole || user.role
  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'OWNER'

  useEffect(() => {
    setMounted(true)

    // Migrate old settings format to new one
    migrateUserSettings()

    // Check mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Load saved nav layout (try new format first, fallback to old)
    try {
      const settings = localStorage.getItem('userSettings')
      if (settings) {
        const parsed = JSON.parse(settings)
        if (parsed.navLayout) {
          setNavLayout(parsed.navLayout)
        }
      } else {
        // Fallback to old format
        const savedLayout = localStorage.getItem('navLayout') as 'top' | 'sidebar' | null
        if (savedLayout) {
          setNavLayout(savedLayout)
        }
      }
    } catch (e) {
      console.error('Failed to load nav layout:', e)
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

  // Mobile Bottom Navigation Component
  const MobileBottomNav = () => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full py-2 px-1 rounded-lg transition-colors touch-manipulation',
              activePath === item.href
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground active:bg-muted'
            )}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium truncate max-w-full">{item.mobileLabel}</span>
          </Link>
        ))}

        {/* More menu button */}
        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 px-1 rounded-lg transition-colors touch-manipulation',
                moreNavItems.some(item => activePath === item.href)
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground active:bg-muted'
              )}
            >
              <MoreHorizontal className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium">Ещё</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle>Меню</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-4 pb-6">
              {moreNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreMenuOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center p-4 rounded-xl transition-colors touch-manipulation',
                    activePath === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 active:bg-muted/60'
                  )}
                >
                  <item.icon className="h-6 w-6 mb-2" />
                  <span className="text-xs font-medium text-center">{item.mobileLabel}</span>
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMoreMenuOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center p-4 rounded-xl transition-colors touch-manipulation',
                    activePath === '/admin'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 active:bg-muted/60'
                  )}
                >
                  <Settings className="h-6 w-6 mb-2" />
                  <span className="text-xs font-medium text-center">Админ</span>
                </Link>
              )}
              <Link
                href="/guide"
                onClick={() => setMoreMenuOpen(false)}
                className={cn(
                  'flex flex-col items-center justify-center p-4 rounded-xl transition-colors touch-manipulation',
                  activePath === '/guide'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 active:bg-muted/60'
                )}
              >
                <BookOpen className="h-6 w-6 mb-2" />
                <span className="text-xs font-medium text-center">Гайд</span>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )

  // Mobile Header Component
  const MobileHeader = () => (
    <header className="md:hidden bg-card border-b sticky top-0 z-40">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground truncate">PASEKA CRM</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserMenu user={user} workspace={workspace} userRole={user.role} />
        </div>
      </div>
    </header>
  )

  // Top Navigation Layout (Desktop)
  if (navLayout === 'top') {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Desktop Header */}
        <header className="hidden md:block bg-card shadow-sm border-b sticky top-0 z-40">
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

        {/* Desktop Navigation */}
        <nav className="hidden md:block bg-card border-b sticky top-[73px] z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
              {allNavItems.map((item) => (
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    )
  }

  // Sidebar Layout (Desktop only, mobile uses same bottom nav)
  return (
    <div className="min-h-screen bg-background flex pb-16 md:pb-0">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40">
        <MobileHeader />
      </div>

      {/* Desktop: Mobile overlay */}
      {!isMobile && sidebarOpen && (
        <div
          className="hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:block fixed left-0 top-0 h-full bg-card border-r z-50 transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
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
          {allNavItems.map((item) => (
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
        sidebarOpen ? 'md:ml-64' : 'md:ml-16',
        'mt-14 md:mt-0' // Account for mobile header
      )}>
        {/* Desktop Top Header */}
        <header className="hidden md:flex h-16 bg-card border-b items-center justify-between px-4 sticky top-0 z-30">
          <div />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <UserMenu user={user} workspace={workspace} userRole={user.role} />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}
