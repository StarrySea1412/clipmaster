import { ipcMain, clipboard, nativeImage, BrowserWindow, shell, globalShortcut } from 'electron'
import { execFile } from 'child_process'
import {
  getItems,
  getItemById,
  togglePin,
  deleteItem,
  clearHistory,
  setShortcut,
  getItemByShortcut,
  getImageDataById,
  getItemsWithShortcuts,
  updateItemContent,
  type GetItemsOptions
} from './database'
import { getShortcut, changeShortcut } from './shortcut'
import type { ClipboardWatcher } from './clipboardWatcher'
import {
  searchLocation,
  fetchWeather,
  getSavedLocation,
  saveLocation,
  getTemperatureUnit,
  setTemperatureUnit,
  getWeatherInfo
} from './weather'
import { getMemos, insertMemo, updateMemo, deleteMemo, completeMemo } from './memo'
import { getMemoryUsage, clearCache, formatBytes } from './memoryStats'
import {
  getTheme,
  setTheme,
  getAutoLaunch,
  setAutoLaunch,
  getHistoryLimit,
  setHistoryLimit
} from './settings'
import { exportData, importData } from './dataExport'
import type { Theme } from '../shared/types'

// 注册单个快捷键的辅助函数
function registerItemShortcut(shortcut: string): boolean {
  if (!shortcut) return false
  if (shortcut === getShortcut()) return false
  if (globalShortcut.isRegistered(shortcut)) return true

  return globalShortcut.register(shortcut, () => {
    const currentItem = getItemByShortcut(shortcut)
    if (currentItem) {
      // 写入剪贴板
      if (currentItem.contentType === 'image' && currentItem.id) {
        const imageData = getImageDataById(currentItem.id)
        if (imageData) {
          const img = nativeImage.createFromBuffer(imageData)
          if (!img.isEmpty()) {
            clipboard.writeImage(img)
          }
        }
      } else if (currentItem.textContent) {
        clipboard.writeText(currentItem.textContent)
      }

      // 模拟粘贴操作 (Ctrl+V)
      setTimeout(() => {
        execFile(
          'powershell',
          [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            '$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys("^v")'
          ],
          (err) => {
            if (err) {
              console.error('[ClipMaster] Failed to simulate paste:', err)
            }
          }
        )
      }, 100)
    }
  })
}

// 加载并注册所有已存在的快捷键
export function loadAndRegisterItemShortcuts(): void {
  try {
    const items = getItems({ limit: 1000 })
    let count = 0
    for (const item of items) {
      if (item.shortcut && registerItemShortcut(item.shortcut)) {
        count++
      }
    }
    if (count > 0) {
      console.log(`[ClipMaster] Loaded and registered ${count} item shortcuts`)
    }
  } catch (err) {
    console.error('[ClipMaster] Failed to load item shortcuts:', err)
  }
}

export function registerIpcHandlers(watcher: ClipboardWatcher): void {
  ipcMain.handle('clipboard:get-items', (_event, options: GetItemsOptions = {}) => {
    try {
      return getItems(options)
    } catch (err) {
      console.error('[ClipMaster] get-items error:', err)
      return []
    }
  })

  ipcMain.handle('clipboard:get-item-by-id', (_event, id: number) => {
    try {
      return getItemById(id)
    } catch (err) {
      console.error('[ClipMaster] get-item-by-id error:', err)
      return undefined
    }
  })

  ipcMain.handle('clipboard:get-image-data', (_event, id: number) => {
    try {
      const imageData = getImageDataById(id)
      if (imageData) {
        return `data:image/png;base64,${imageData.toString('base64')}`
      }
      return null
    } catch (err) {
      console.error('[ClipMaster] get-image-data error:', err)
      return null
    }
  })

  ipcMain.handle('clipboard:toggle-pin', (_event, id: number) => {
    try {
      return togglePin(id)
    } catch (err) {
      console.error('[ClipMaster] toggle-pin error:', err)
      return undefined
    }
  })

  ipcMain.handle('clipboard:delete-item', (_event, id: number) => {
    try {
      return deleteItem(id)
    } catch (err) {
      console.error('[ClipMaster] delete-item error:', err)
      return false
    }
  })

  ipcMain.handle('clipboard:clear-history', (_event, keepPinned: boolean) => {
    try {
      clearHistory(keepPinned)
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('clipboard:history-cleared')
      }
    } catch (err) {
      console.error('[ClipMaster] clear-history error:', err)
    }
  })

  ipcMain.handle('clipboard:copy-to-clipboard', (_event, id: number) => {
    try {
      const item = getItemById(id)
      if (!item) return false

      watcher.pause(1000)

      if (item.contentType === 'image') {
        const imageData = getImageDataById(id)
        if (imageData) {
          const img = nativeImage.createFromBuffer(imageData)
          if (!img.isEmpty()) {
            clipboard.writeImage(img)
          }
        }
      } else if (item.textContent) {
        clipboard.writeText(item.textContent)
      }
      return true
    } catch (err) {
      console.error('[ClipMaster] copy-to-clipboard error:', err)
      return false
    }
  })

  ipcMain.handle('clipboard:open-url', (_event, url: string) => {
    try {
      if (typeof url !== 'string') return false
      let target = url.trim()
      if (!target) return false

      if (!/^https?:\/\//i.test(target)) {
        target = `https://${target}`
      }

      try {
        new URL(target)
      } catch {
        return false
      }

      shell.openExternal(target)
      return true
    } catch (err) {
      console.error('[ClipMaster] open-url error:', err)
      return false
    }
  })

  ipcMain.handle('clipboard:get-shortcut', () => {
    try {
      return getShortcut()
    } catch (err) {
      console.error('[ClipMaster] get-shortcut error:', err)
      return 'Alt+Shift+V'
    }
  })

  ipcMain.handle('clipboard:set-shortcut', (_event, shortcut: string) => {
    try {
      if (!shortcut || typeof shortcut !== 'string') return false
      return changeShortcut(shortcut)
    } catch (err) {
      console.error('[ClipMaster] set-shortcut error:', err)
      return false
    }
  })

  ipcMain.handle('clipboard:set-item-shortcut', (_event, id: number, shortcut: string | null) => {
    try {
      const oldItem = getItemById(id)
      const oldShortcut = oldItem?.shortcut ?? null

      if (shortcut === getShortcut()) {
        return null
      }

      const needsNewRegistration =
        !!shortcut && shortcut !== oldShortcut && !globalShortcut.isRegistered(shortcut)
      const createdRegistration =
        needsNewRegistration && !!shortcut && registerItemShortcut(shortcut)

      if (needsNewRegistration && !createdRegistration) {
        return null
      }

      const item = setShortcut(id, shortcut)
      if (!item) {
        if (createdRegistration && shortcut) {
          globalShortcut.unregister(shortcut)
        }
        return null
      }

      if (oldShortcut && oldShortcut !== shortcut && !getItemByShortcut(oldShortcut)) {
        globalShortcut.unregister(oldShortcut)
      }

      return item
    } catch (err) {
      console.error('[ClipMaster] set-item-shortcut error:', err)
      return null
    }
  })

  ipcMain.handle('clipboard:get-item-by-shortcut', (_event, shortcut: string) => {
    try {
      return getItemByShortcut(shortcut)
    } catch (err) {
      console.error('[ClipMaster] get-item-by-shortcut error:', err)
      return null
    }
  })

  ipcMain.handle('clipboard:get-items-with-shortcuts', () => {
    try {
      return getItemsWithShortcuts()
    } catch (err) {
      console.error('[ClipMaster] get-items-with-shortcuts error:', err)
      return []
    }
  })

  ipcMain.handle('clipboard:update-content', (_event, id: number, content: string) => {
    try {
      return updateItemContent(id, content)
    } catch (err) {
      console.error('[ClipMaster] update-content error:', err)
      return null
    }
  })

  ipcMain.on('window:hide', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.hide()
  })

  ipcMain.handle('weather:search-location', async (_event, query: string) => {
    try {
      console.log('[ClipMaster] IPC weather:search-location called with:', query)
      const result = await searchLocation(query)
      console.log('[ClipMaster] IPC weather:search-location result:', result)
      return result
    } catch (err) {
      console.error('[ClipMaster] weather:search-location error:', err)
      return []
    }
  })

  ipcMain.handle('weather:fetch', async () => {
    try {
      console.log('[ClipMaster] IPC weather:fetch called')
      const location = getSavedLocation()
      console.log('[ClipMaster] Saved location:', location)
      if (!location) return null
      const data = await fetchWeather(location.lat, location.lon)
      if (data) {
        data.location = location.name
      }
      console.log('[ClipMaster] IPC weather:fetch result:', data)
      return data
    } catch (err) {
      console.error('[ClipMaster] weather:fetch error:', err)
      return null
    }
  })

  ipcMain.handle('weather:get-location', () => {
    const location = getSavedLocation()
    console.log('[ClipMaster] IPC weather:get-location called, returning:', location)
    return location
  })

  ipcMain.handle('weather:set-location', (_event, lat: number, lon: number, name: string) => {
    try {
      console.log('[ClipMaster] IPC weather:set-location called with:', lat, lon, name)
      saveLocation(lat, lon, name)
      return true
    } catch (err) {
      console.error('[ClipMaster] weather:set-location error:', err)
      return false
    }
  })

  ipcMain.handle('weather:get-unit', () => {
    return getTemperatureUnit()
  })

  ipcMain.handle('weather:set-unit', (_event, unit: 'celsius' | 'fahrenheit') => {
    try {
      setTemperatureUnit(unit)
      return true
    } catch (err) {
      console.error('[ClipMaster] weather:set-unit error:', err)
      return false
    }
  })

  ipcMain.handle('weather:get-info', (_event, code: number) => {
    return getWeatherInfo(code)
  })

  // Memo IPC handlers
  ipcMain.handle('memo:get-all', () => {
    try {
      return getMemos()
    } catch (err) {
      console.error('[ClipMaster] memo:get-all error:', err)
      return []
    }
  })

  ipcMain.handle('memo:create', (_event, title: string, content: string, remindAt: number) => {
    try {
      return insertMemo(title, content, remindAt)
    } catch (err) {
      console.error('[ClipMaster] memo:create error:', err)
      return null
    }
  })

  ipcMain.handle(
    'memo:update',
    (_event, id: number, title: string, content: string, remindAt: number) => {
      try {
        return updateMemo(id, title, content, remindAt)
      } catch (err) {
        console.error('[ClipMaster] memo:update error:', err)
        return null
      }
    }
  )

  ipcMain.handle('memo:delete', (_event, id: number) => {
    try {
      return deleteMemo(id)
    } catch (err) {
      console.error('[ClipMaster] memo:delete error:', err)
      return false
    }
  })

  ipcMain.handle('memo:complete', (_event, id: number) => {
    try {
      return completeMemo(id)
    } catch (err) {
      console.error('[ClipMaster] memo:complete error:', err)
      return false
    }
  })

  // Settings IPC handlers
  ipcMain.handle('settings:get-theme', () => {
    return getTheme()
  })

  ipcMain.handle('settings:set-theme', (_event, theme: Theme) => {
    try {
      setTheme(theme)
      return true
    } catch (err) {
      console.error('[ClipMaster] settings:set-theme error:', err)
      return false
    }
  })

  ipcMain.handle('settings:get-auto-launch', () => {
    return getAutoLaunch()
  })

  ipcMain.handle('settings:set-auto-launch', async (_event, enabled: boolean) => {
    try {
      await setAutoLaunch(enabled)
      return true
    } catch (err) {
      console.error('[ClipMaster] settings:set-auto-launch error:', err)
      return false
    }
  })

  ipcMain.handle('settings:get-history-limit', () => {
    return getHistoryLimit()
  })

  ipcMain.handle('settings:set-history-limit', (_event, limit: number) => {
    try {
      setHistoryLimit(limit)
    } catch (err) {
      console.error('[ClipMaster] settings:set-history-limit error:', err)
    }
  })

  ipcMain.handle('data:export', async () => {
    try {
      const result = await exportData()
      return result
    } catch (err) {
      console.error('[ClipMaster] data:export error:', err)
      return null
    }
  })

  ipcMain.handle('data:import', async () => {
    try {
      const result = await importData()
      return result
    } catch (err) {
      console.error('[ClipMaster] data:import error:', err)
      return { success: false, message: String(err) }
    }
  })

  // Memory stats IPC handlers
  ipcMain.handle('memory:get-usage', () => {
    try {
      const usage = getMemoryUsage()
      return {
        database: formatBytes(usage.database),
        images: formatBytes(usage.images),
        cache: formatBytes(usage.cache),
        logs: formatBytes(usage.logs),
        settings: formatBytes(usage.settings),
        total: formatBytes(usage.total),
        appMemory: formatBytes(usage.appMemory),
        raw: usage
      }
    } catch (err) {
      console.error('[ClipMaster] memory:get-usage error:', err)
      return null
    }
  })

  ipcMain.handle('memory:clear-cache', () => {
    try {
      clearCache()
      return true
    } catch (err) {
      console.error('[ClipMaster] memory:clear-cache error:', err)
      return false
    }
  })
}
