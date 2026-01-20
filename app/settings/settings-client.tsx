'use client'

import { AppLayout } from '@/components/layout'
import { UserSettingsPanel } from '@/components/settings/user-settings-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, User, Bell, Shield } from 'lucide-react'

interface SettingsClientProps {
  user: any
  workspace: any
  userRole: string
}

export default function SettingsClient({ user, workspace, userRole }: SettingsClientProps) {
  return (
    <AppLayout user={user} workspace={workspace} currentPage="/settings" userRole={userRole}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Настройки</h2>
          <p className="text-sm text-muted-foreground">
            Управление настройками профиля и интерфейса
          </p>
        </div>

        <Tabs defaultValue="display" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="display">
              <Settings className="h-4 w-4 mr-2" />
              Отображение
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Уведомления
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="h-4 w-4 mr-2" />
              Приватность
            </TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-6">
            <div className="bg-card rounded-lg shadow p-6">
              <UserSettingsPanel />
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="bg-card rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Информация профиля</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Имя</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Workspace</label>
                  <p className="text-sm text-muted-foreground mt-1">{workspace.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Роль</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {userRole === 'OWNER' && 'Владелец'}
                    {userRole === 'ADMIN' && 'Администратор'}
                    {userRole === 'MEMBER' && 'Участник'}
                    {userRole === 'VIEWER' && 'Наблюдатель'}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground pt-4 border-t">
                  Для изменения данных профиля обратитесь к администратору
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="bg-card rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Настройки уведомлений</h3>
              <p className="text-sm text-muted-foreground">
                Настройки уведомлений находятся в разработке
              </p>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <div className="bg-card rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Приватность и безопасность</h3>
              <p className="text-sm text-muted-foreground">
                Настройки приватности находятся в разработке
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
