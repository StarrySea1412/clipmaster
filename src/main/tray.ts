import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import icon from '../../resources/icon.png?asset'

let tray: Tray | null = null

export function createTray(
  mainWindow: BrowserWindow,
  onClearHistory: () => void,
  onQuit: () => void
): Tray {
  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })

  tray = new Tray(trayIcon)
  tray.setToolTip('ClipMaster')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示 ClipMaster',
      click: (): void => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: '清空历史',
      click: onClearHistory
    },
    { type: 'separator' },
    {
      label: '退出',
      click: onQuit
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  return tray
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
