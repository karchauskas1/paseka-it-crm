'use client'

import { useState, useEffect } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type NavLayout = 'top' | 'sidebar'
export type Language = 'ru' | 'en'
export type DateFormat = 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'

interface UserSettings {
  theme: Theme
  navLayout: NavLayout
  language: Language
  dateFormat: DateFormat
  compactMode: boolean
  showNotifications: boolean
}

const defaultSettings: UserSettings = {
  theme: 'system',
  navLayout: 'top',
  language: 'ru',
  dateFormat: 'DD.MM.YYYY',
  compactMode: false,
  showNotifications: true,
}

/**
 * Centralized hook for managing user settings
 * All settings are persisted in localStorage
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [mounted, setMounted] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('userSettings')
        if (saved) {
          const parsed = JSON.parse(saved)
          setSettings({ ...defaultSettings, ...parsed })
        }
      } catch (error) {
        console.error('Failed to load user settings:', error)
      }
    }

    loadSettings()
    setMounted(true)
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem('userSettings', JSON.stringify(settings))
      } catch (error) {
        console.error('Failed to save user settings:', error)
      }
    }
  }, [settings, mounted])

  // Update individual setting
  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))

    // Trigger events for backward compatibility
    if (key === 'theme') {
      applyTheme(value as Theme)
    } else if (key === 'navLayout') {
      window.dispatchEvent(
        new CustomEvent('navLayoutChange', { detail: value })
      )
    }
  }

  // Bulk update settings
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))

    // Apply theme if it was updated
    if (newSettings.theme) {
      applyTheme(newSettings.theme)
    }

    // Dispatch nav layout event if it was updated
    if (newSettings.navLayout) {
      window.dispatchEvent(
        new CustomEvent('navLayoutChange', { detail: newSettings.navLayout })
      )
    }
  }

  // Reset settings to default
  const resetSettings = () => {
    setSettings(defaultSettings)
    applyTheme(defaultSettings.theme)
    window.dispatchEvent(
      new CustomEvent('navLayoutChange', { detail: defaultSettings.navLayout })
    )
  }

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    mounted,
  }
}

/**
 * Apply theme to document
 */
function applyTheme(theme: Theme) {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

/**
 * Initialize theme from localStorage (for inline script)
 * This function is meant to be called in a <script> tag in the <head>
 */
export function getThemeInitScript() {
  return `
    (function() {
      try {
        const settings = localStorage.getItem('userSettings');
        const theme = settings ? JSON.parse(settings).theme : 'system';

        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          document.documentElement.classList.add(systemTheme);
        } else {
          document.documentElement.classList.add(theme);
        }
      } catch (e) {
        // Fallback to old localStorage key for backward compatibility
        try {
          const theme = localStorage.getItem('theme') || 'system';
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.classList.add(systemTheme);
          } else {
            document.documentElement.classList.add(theme);
          }
        } catch (e2) {}
      }
    })();
  `
}
