import { app } from 'electron'
import type { Theme } from '../shared/types'
import { readStoredSettings, updateStoredSettings } from './storage'

interface AppSettings {
  theme: Theme
  autoLaunch: boolean
  historyLimit: number
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  autoLaunch: false,
  historyLimit: 500
}

let currentSettings: AppSettings = { ...DEFAULT_SETTINGS }

function normalizeSettings(): AppSettings {
  const stored = readStoredSettings()

  return {
    theme:
      stored.theme === 'light' || stored.theme === 'dark' ? stored.theme : DEFAULT_SETTINGS.theme,
    autoLaunch:
      typeof stored.autoLaunch === 'boolean' ? stored.autoLaunch : DEFAULT_SETTINGS.autoLaunch,
    historyLimit:
      typeof stored.historyLimit === 'number'
        ? Math.max(100, Math.min(5000, stored.historyLimit))
        : DEFAULT_SETTINGS.historyLimit
  }
}

export function loadAppSettings(): AppSettings {
  try {
    currentSettings = normalizeSettings()
  } catch (err) {
    console.error('[ClipMaster] Failed to load app settings:', err)
  }
  return currentSettings
}

export function saveAppSettings(): void {
  try {
    updateStoredSettings({
      theme: currentSettings.theme,
      autoLaunch: currentSettings.autoLaunch,
      historyLimit: currentSettings.historyLimit
    })
  } catch (err) {
    console.error('[ClipMaster] Failed to save app settings:', err)
  }
}

export function getTheme(): Theme {
  return currentSettings.theme
}

export function setTheme(theme: Theme): void {
  currentSettings.theme = theme
  saveAppSettings()
}

export function getAutoLaunch(): boolean {
  return currentSettings.autoLaunch
}

export async function setAutoLaunch(enabled: boolean): Promise<void> {
  try {
    const isWindows = process.platform === 'win32'
    const isMac = process.platform === 'darwin'

    if (isWindows) {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true,
        name: 'ClipMaster'
      })
    } else if (isMac) {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true
      })
    } else {
      app.setLoginItemSettings({
        openAtLogin: enabled
      })
    }

    currentSettings.autoLaunch = enabled
    saveAppSettings()

    console.log('[ClipMaster] Auto launch set to:', enabled)
  } catch (err) {
    console.error('[ClipMaster] Failed to set auto launch:', err)
    throw err
  }
}

export function initAutoLaunch(): void {
  const settings = loadAppSettings()
  if (settings.autoLaunch) {
    setAutoLaunch(true).catch((err) => {
      console.error('[ClipMaster] Failed to init auto launch:', err)
    })
  }
}

export function getHistoryLimit(): number {
  return currentSettings.historyLimit
}

export function setHistoryLimit(limit: number): void {
  currentSettings.historyLimit = Math.max(100, Math.min(5000, limit))
  saveAppSettings()
}
