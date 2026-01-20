/**
 * Migrate old settings format to new centralized format
 * This ensures backward compatibility
 */
export function migrateUserSettings() {
  if (typeof window === 'undefined') return

  try {
    // Check if new format already exists
    const newSettings = localStorage.getItem('userSettings')
    if (newSettings) return // Already migrated

    // Migrate old settings
    const oldTheme = localStorage.getItem('theme')
    const oldNavLayout = localStorage.getItem('navLayout')

    if (oldTheme || oldNavLayout) {
      const settings = {
        theme: oldTheme || 'system',
        navLayout: oldNavLayout || 'top',
        language: 'ru',
        dateFormat: 'DD.MM.YYYY',
        compactMode: false,
        showNotifications: true,
      }

      localStorage.setItem('userSettings', JSON.stringify(settings))

      // Keep old keys for backward compatibility
      console.log('✅ User settings migrated to new format')
    }
  } catch (error) {
    console.error('Failed to migrate user settings:', error)
  }
}
