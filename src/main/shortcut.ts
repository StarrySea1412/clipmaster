import { globalShortcut, BrowserWindow, app } from 'electron'
import { join } from 'path'
import fs from 'fs'

const DEFAULT_SHORTCUT = 'Alt+Shift+V'
const SETTINGS_FILE = 'settings.json'

let currentShortcut: string = DEFAULT_SHORTCUT
let currentWindow: BrowserWindow | null = null

function getSettingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE)
}

function loadSettings(): { shortcut: string } {
  try {
    const filePath = getSettingsPath()
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      return { shortcut: data.shortcut || DEFAULT_SHORTCUT }
    }
  } catch {
    // Ignore errors when reading shortcut settings
  }
  return { shortcut: DEFAULT_SHORTCUT }
}

function saveSettings(settings: { shortcut: string }): void {
  try {
    const filePath = getSettingsPath()
    let existing: Record<string, unknown> = {}
    try {
      if (fs.existsSync(filePath)) {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      }
    } catch {
      // Ignore errors when reading existing settings
    }
    fs.writeFileSync(filePath, JSON.stringify({ ...existing, ...settings }, null, 2), 'utf-8')
  } catch (err) {
    console.error('[ClipMaster] Failed to save settings:', err)
  }
}

function toggleWindow(): void {
  if (!currentWindow || currentWindow.isDestroyed()) return
  if (currentWindow.isVisible()) {
    currentWindow.hide()
  } else {
    currentWindow.show()
    currentWindow.focus()
  }
}

export function getShortcut(): string {
  return currentShortcut
}

export function registerShortcut(mainWindow: BrowserWindow, accelerator?: string): boolean {
  currentWindow = mainWindow
  const shortcut = accelerator || loadSettings().shortcut
  currentShortcut = shortcut

  const registered = globalShortcut.register(shortcut, toggleWindow)

  if (!registered) {
    console.warn(`[ClipMaster] Failed to register global shortcut: ${shortcut}`)
    if (shortcut !== DEFAULT_SHORTCUT) {
      currentShortcut = DEFAULT_SHORTCUT
      return globalShortcut.register(DEFAULT_SHORTCUT, toggleWindow)
    }
  }

  return registered
}

export function changeShortcut(newAccelerator: string): boolean {
  globalShortcut.unregister(currentShortcut)

  const registered = globalShortcut.register(newAccelerator, toggleWindow)

  if (registered) {
    currentShortcut = newAccelerator
    saveSettings({ shortcut: newAccelerator })
    return true
  }

  globalShortcut.register(currentShortcut, toggleWindow)
  return false
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll()
}
