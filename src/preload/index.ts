import { contextBridge, ipcRenderer } from 'electron'
import type { ClipboardAPI, ClipboardItem, Theme } from '../shared/types'

const api: ClipboardAPI = {
  getItems: (options) => ipcRenderer.invoke('clipboard:get-items', options),
  getItemById: (id) => ipcRenderer.invoke('clipboard:get-item-by-id', id),
  getImageData: (id) => ipcRenderer.invoke('clipboard:get-image-data', id),
  togglePin: (id) => ipcRenderer.invoke('clipboard:toggle-pin', id),
  deleteItem: (id) => ipcRenderer.invoke('clipboard:delete-item', id),
  clearHistory: (keepPinned) => ipcRenderer.invoke('clipboard:clear-history', keepPinned),
  copyToClipboard: (id) => ipcRenderer.invoke('clipboard:copy-to-clipboard', id),
  openUrl: (url) => ipcRenderer.invoke('clipboard:open-url', url),
  hideWindow: () => ipcRenderer.send('window:hide'),
  getShortcut: () => ipcRenderer.invoke('clipboard:get-shortcut'),
  setShortcut: (shortcut) => ipcRenderer.invoke('clipboard:set-shortcut', shortcut),
  setItemShortcut: (id, shortcut) =>
    ipcRenderer.invoke('clipboard:set-item-shortcut', id, shortcut),
  getItemByShortcut: (shortcut) => ipcRenderer.invoke('clipboard:get-item-by-shortcut', shortcut),
  getItemsWithShortcuts: () => ipcRenderer.invoke('clipboard:get-items-with-shortcuts'),

  getTheme: () => ipcRenderer.invoke('settings:get-theme'),
  setTheme: (theme: Theme) => ipcRenderer.invoke('settings:set-theme', theme),
  getAutoLaunch: () => ipcRenderer.invoke('settings:get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('settings:set-auto-launch', enabled),
  getHistoryLimit: () => ipcRenderer.invoke('settings:get-history-limit'),
  setHistoryLimit: (limit) => ipcRenderer.invoke('settings:set-history-limit', limit),
  updateItemContent: (id, content) => ipcRenderer.invoke('clipboard:update-content', id, content),
  exportData: () => ipcRenderer.invoke('data:export'),
  importData: () => ipcRenderer.invoke('data:import'),

  searchLocation: (query) => ipcRenderer.invoke('weather:search-location', query),
  fetchWeather: () => ipcRenderer.invoke('weather:fetch'),
  getWeatherLocation: () => ipcRenderer.invoke('weather:get-location'),
  setWeatherLocation: (lat, lon, name) =>
    ipcRenderer.invoke('weather:set-location', lat, lon, name),
  getTemperatureUnit: () => ipcRenderer.invoke('weather:get-unit'),
  setTemperatureUnit: (unit) => ipcRenderer.invoke('weather:set-unit', unit),
  getWeatherInfo: (code) => ipcRenderer.invoke('weather:get-info', code),

  // Memo APIs
  getMemos: () => ipcRenderer.invoke('memo:get-all'),
  createMemo: (title, content, remindAt) =>
    ipcRenderer.invoke('memo:create', title, content, remindAt),
  updateMemo: (id, title, content, remindAt) =>
    ipcRenderer.invoke('memo:update', id, title, content, remindAt),
  deleteMemo: (id) => ipcRenderer.invoke('memo:delete', id),
  completeMemo: (id) => ipcRenderer.invoke('memo:complete', id),

  // Memory APIs
  getMemoryUsage: () => ipcRenderer.invoke('memory:get-usage'),
  clearCache: () => ipcRenderer.invoke('memory:clear-cache'),

  onNewItem: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, item: ClipboardItem): void => {
      callback(item)
    }
    ipcRenderer.on('clipboard:new-item', handler)
  },

  onHistoryCleared: (callback) => {
    ipcRenderer.on('clipboard:history-cleared', () => callback())
  },

  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('clipboard:new-item')
    ipcRenderer.removeAllListeners('clipboard:history-cleared')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('clipboardAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore: Expose API to window for renderer process
  window.clipboardAPI = api
}
