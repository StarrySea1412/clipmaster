import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import type { Theme } from '../shared/types'

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

const SETTINGS_FILE = 'app-settings.json'

let currentSettings: AppSettings = { ...DEFAULT_SETTINGS }

function getSettingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE)
}

export function loadAppSettings(): AppSettings {
  try {
    const filePath = getSettingsPath()
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      currentSettings = { ...DEFAULT_SETTINGS, ...data }
    }
  } catch (err) {
    console.error('[ClipMaster] Failed to load app settings:', err)
  }
  return currentSettings
}

export function saveAppSettings(): void {
  try {
    const filePath = getSettingsPath()
    fs.writeFileSync(filePath, JSON.stringify(currentSettings, null, 2), 'utf-8')
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
