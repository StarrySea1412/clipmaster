import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initDB,
  insertItem,
  insertImageItem,
  isDuplicate,
  enforceHistoryLimit,
  closeDB,
  clearHistory
} from './database'
import { ClipboardWatcher, type ClipboardChangeEvent } from './clipboardWatcher'
import { registerIpcHandlers, loadAndRegisterItemShortcuts } from './ipc'
import { createTray, destroyTray } from './tray'
import { registerShortcut, unregisterAllShortcuts } from './shortcut'
import { loadAppSettings, initAutoLaunch, getHistoryLimit } from './settings'
import { clearAllMemoTimers } from './memo'

let mainWindow: BrowserWindow | null = null
let watcher: ClipboardWatcher | null = null
let isQuitting = false
let insertsSinceCleanup = 0
const CLEANUP_INTERVAL = 10

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('disable-software-rasterizer')

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 360,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    icon,
    title: 'ClipMaster',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true,
      spellcheck: false,
      webSecurity: true,
      v8CacheOptions: 'code'
    }
  })

  win.on('ready-to-show', () => {
    win.center()
    win.show()
    win.focus()
    win.setAlwaysOnTop(true, 'screen-saver')
    setTimeout(() => win.setAlwaysOnTop(false), 500)
  })

  win.webContents.on('did-finish-load', () => {
    if (is.dev) {
      console.log('[ClipMaster] Web contents loaded')
    }
  })

  win.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('[ClipMaster] Failed to load:', errorCode, errorDescription)
  })

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
      if (watcher) {
        watcher.setWindowVisible(false)
      }
      if (process.platform === 'win32' || process.platform === 'linux') {
        win.webContents.setBackgroundThrottling(true)
      }
    }
  })

  win.on('show', () => {
    if (watcher) {
      watcher.setWindowVisible(true)
    }
    if (process.platform === 'win32' || process.platform === 'linux') {
      win.webContents.setBackgroundThrottling(false)
    }
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (is.dev) {
    win.webContents.openDevTools()
  }

  return win
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.clipmaster.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    initDB()
  } catch (err) {
    console.error('[ClipMaster] Database init failed:', err)
    dialog.showErrorBox('ClipMaster 错误', `数据库初始化失败: ${err}\n\n应用将退出。`)
    app.quit()
    return
  }

  loadAppSettings()
  initAutoLaunch()

  mainWindow = createWindow()

  watcher = new ClipboardWatcher(2000)

  registerIpcHandlers(watcher)

  watcher.on('change', (data: ClipboardChangeEvent) => {
    if (isDuplicate(data.hash)) {
      return
    }

    let item
    if (data.type === 'image' && data.imageBuffer) {
      try {
        item = insertImageItem(data.imageBuffer, data.hash)
      } catch (err) {
        console.error('[ClipMaster] Failed to save image:', err)
        return
      }
    } else if (data.type === 'text' && data.textContent) {
      item = insertItem(data.textContent, data.hash)
    }

    if (!item) {
      return
    }

    insertsSinceCleanup++
    if (insertsSinceCleanup >= CLEANUP_INTERVAL) {
      insertsSinceCleanup = 0
      enforceHistoryLimit(getHistoryLimit())
    }

    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      mainWindow.webContents.send('clipboard:new-item', item)
    }
  })

  watcher.start()

  try {
    createTray(
      mainWindow,
      () => {
        clearHistory(true)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard:history-cleared')
        }
      },
      () => {
        isQuitting = true
        app.quit()
      }
    )
  } catch (err) {
    console.error('[ClipMaster] Failed to create tray:', err)
  }

  try {
    registerShortcut(mainWindow)
  } catch (err) {
    console.error('[ClipMaster] Failed to register shortcut:', err)
  }

  // 加载并注册所有已存在的剪贴板项快捷键
  try {
    loadAndRegisterItemShortcuts()
  } catch (err) {
    console.error('[ClipMaster] Failed to load item shortcuts:', err)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
    }
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  unregisterAllShortcuts()
  clearAllMemoTimers()
  if (watcher) watcher.stop()
  destroyTray()
  closeDB()
})

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') {
    // macOS 中通常不关闭应用
  }
})
