'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type NavLayout = 'top' | 'sidebar'
export type Language = 'ru' | 'en'
export type DateFormat = 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type TasksView = 'table' | 'kanban'

export interface UserSettings {
  theme: Theme
  navLayout: NavLayout
  language: Language
  dateFormat: DateFormat
  compactMode: boolean
  showNotifications: boolean
  tasksView: TasksView
}

const defaultSettings: UserSettings = {
  theme: 'system',
  navLayout: 'top',
  language: 'ru',
  dateFormat: 'DD.MM.YYYY',
  compactMode: false,
  showNotifications: true,
  tasksView: 'table',
}

const STORAGE_KEY = 'userSettings'
const SYNC_DEBOUNCE_MS = 1000

/**
 * Centralized hook for managing user settings
 * Settings are stored in both localStorage (fast) and server (persistent across devices)
 *
 * Strategy:
 * 1. Load from localStorage immediately for fast initial render
 * 2. Sync with server after mount - server is source of truth
 * 3. On change: save to localStorage immediately + debounced save to server
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [mounted, setMounted] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingChangesRef = useRef<Partial<UserSettings> | null>(null)

  // Load settings from localStorage on mount, then sync with server
  useEffect(() => {
    const loadAndSync = async () => {
      // Step 1: Load from localStorage for fast render
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          setSettings({ ...defaultSettings, ...parsed })
        }
      } catch (error) {
        console.error('Failed to load settings from localStorage:', error)
      }

      setMounted(true)

      // Step 2: Sync with server (server is source of truth)
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const serverSettings = await response.json()
          const mergedSettings = { ...defaultSettings, ...serverSettings }
          setSettings(mergedSettings)
          // Update localStorage with server data
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedSettings))
          // Apply theme from server
          applyTheme(mergedSettings.theme)
        }
      } catch (error) {
        console.error('Failed to sync settings from server:', error)
        // Keep using localStorage settings if server is unavailable
      }
    }

    loadAndSync()
  }, [])

  // Debounced sync to server
  const syncToServer = useCallback(async (changes: Partial<UserSettings>) => {
    // Accumulate pending changes
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      ...changes,
    }

    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Set new timeout for debounced sync
    syncTimeoutRef.current = setTimeout(async () => {
      const changesToSync = pendingChangesRef.current
      if (!changesToSync) return

      pendingChangesRef.current = null
      setSyncing(true)
      setLastSyncError(null)

      try {
        const response = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changesToSync),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to save settings')
        }
      } catch (error) {
        console.error('Failed to sync settings to server:', error)
        setLastSyncError(error instanceof Error ? error.message : 'Sync failed')
      } finally {
        setSyncing(false)
      }
    }, SYNC_DEBOUNCE_MS)
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch (error) {
        console.error('Failed to save settings to localStorage:', error)
      }
    }
  }, [settings, mounted])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  // Update individual setting
  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))

    // Sync to server
    syncToServer({ [key]: value } as Partial<UserSettings>)

    // Trigger events for backward compatibility
    if (key === 'theme') {
      applyTheme(value as Theme)
    } else if (key === 'navLayout') {
      window.dispatchEvent(
        new CustomEvent('navLayoutChange', { detail: value })
      )
    }
  }, [syncToServer])

  // Bulk update settings
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))

    // Sync to server
    syncToServer(newSettings)

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
  }, [syncToServer])

  // Reset settings to default
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    syncToServer(defaultSettings)
    applyTheme(defaultSettings.theme)
    window.dispatchEvent(
      new CustomEvent('navLayoutChange', { detail: defaultSettings.navLayout })
    )
  }, [syncToServer])

  // Force sync from server (useful after login)
  const refreshFromServer = useCallback(async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/settings')
      if (response.ok) {
        const serverSettings = await response.json()
        const mergedSettings = { ...defaultSettings, ...serverSettings }
        setSettings(mergedSettings)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedSettings))
        applyTheme(mergedSettings.theme)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to refresh settings from server:', error)
      return false
    } finally {
      setSyncing(false)
    }
  }, [])

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    refreshFromServer,
    mounted,
    syncing,
    lastSyncError,
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
