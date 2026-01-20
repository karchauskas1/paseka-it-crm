'use client'

import { useUserSettings } from '@/lib/hooks/use-user-settings'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Sun,
  Moon,
  Monitor,
  PanelTop,
  PanelLeft,
  Globe,
  Calendar,
  Minimize2,
  Bell,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

export function UserSettingsPanel() {
  const { settings, updateSetting, resetSettings, mounted } = useUserSettings()

  if (!mounted) {
    return <div className="text-sm text-muted-foreground">Загрузка настроек...</div>
  }

  const handleReset = () => {
    if (confirm('Сбросить все настройки на значения по умолчанию?')) {
      resetSettings()
      toast.success('Настройки сброшены')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Настройки отображения</h3>

        {/* Theme */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Тема</Label>
              <p className="text-sm text-muted-foreground">
                Выберите цветовую схему интерфейса
              </p>
            </div>
            <Select
              value={settings.theme}
              onValueChange={(value) => {
                updateSetting('theme', value as any)
                toast.success(`Тема изменена на ${value === 'light' ? 'светлую' : value === 'dark' ? 'тёмную' : 'системную'}`)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Светлая
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Тёмная
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Системная
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nav Layout */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Навигация</Label>
              <p className="text-sm text-muted-foreground">
                Расположение панели навигации
              </p>
            </div>
            <Select
              value={settings.navLayout}
              onValueChange={(value) => {
                updateSetting('navLayout', value as any)
                toast.success(`Навигация изменена на ${value === 'top' ? 'верхнюю панель' : 'боковое меню'}`)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">
                  <div className="flex items-center gap-2">
                    <PanelTop className="h-4 w-4" />
                    Верхняя панель
                  </div>
                </SelectItem>
                <SelectItem value="sidebar">
                  <div className="flex items-center gap-2">
                    <PanelLeft className="h-4 w-4" />
                    Боковое меню
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Язык</Label>
              <p className="text-sm text-muted-foreground">
                Язык интерфейса системы
              </p>
            </div>
            <Select
              value={settings.language}
              onValueChange={(value) => {
                updateSetting('language', value as any)
                toast.success('Язык изменён')
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Русский
                  </div>
                </SelectItem>
                <SelectItem value="en">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    English
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Format */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Формат даты</Label>
              <p className="text-sm text-muted-foreground">
                Формат отображения дат
              </p>
            </div>
            <Select
              value={settings.dateFormat}
              onValueChange={(value) => {
                updateSetting('dateFormat', value as any)
                toast.success('Формат даты изменён')
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD.MM.YYYY">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    ДД.ММ.ГГГГ
                  </div>
                </SelectItem>
                <SelectItem value="MM/DD/YYYY">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    ММ/ДД/ГГГГ
                  </div>
                </SelectItem>
                <SelectItem value="YYYY-MM-DD">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    ГГГГ-ММ-ДД
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Compact Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Компактный режим</Label>
              <p className="text-sm text-muted-foreground">
                Уменьшенные отступы и размеры элементов
              </p>
            </div>
            <Switch
              checked={settings.compactMode}
              onCheckedChange={(checked) => {
                updateSetting('compactMode', checked)
                toast.success(checked ? 'Компактный режим включён' : 'Компактный режим выключен')
              }}
            />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Уведомления</Label>
              <p className="text-sm text-muted-foreground">
                Показывать всплывающие уведомления
              </p>
            </div>
            <Switch
              checked={settings.showNotifications}
              onCheckedChange={(checked) => {
                updateSetting('showNotifications', checked)
                toast.success(checked ? 'Уведомления включены' : 'Уведомления выключены')
              }}
            />
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          className="w-full"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Сбросить все настройки
        </Button>
      </div>
    </div>
  )
}
