import { globalShortcut, BrowserWindow } from 'electron'
import { readStoredSettings, updateStoredSettings } from './storage'

const DEFAULT_SHORTCUT = 'Alt+Shift+V'

let currentShortcut: string = DEFAULT_SHORTCUT
let currentWindow: BrowserWindow | null = null

function loadSettings(): { shortcut: string } {
  try {
    const stored = readStoredSettings()
    return { shortcut: typeof stored.shortcut === 'string' ? stored.shortcut : DEFAULT_SHORTCUT }
  } catch {
    // Ignore errors when reading shortcut settings
  }
  return { shortcut: DEFAULT_SHORTCUT }
}

function saveSettings(settings: { shortcut: string }): void {
  try {
    updateStoredSettings(settings)
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
