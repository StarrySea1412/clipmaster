import { dialog } from 'electron'
import fs from 'fs'
import { getDB } from './database'
import { readStoredSettings, writeStoredSettings, type StoredSettings } from './storage'

interface ClipboardItemRow {
  id: number
  content_type: string
  content_category: string
  text_content: string | null
  image_data: Buffer | null
  content_hash: string
  is_pinned: number
  created_at: number
  shortcut: string | null
}

interface MemoRow {
  id: number
  title: string
  content: string
  remind_at: number
  is_completed: number
  created_at: number
}

interface ExportData {
  version: string
  exportedAt: number
  clipboardItems: ClipboardItemRow[]
  memos: MemoRow[]
  settings: StoredSettings
}

function isValidClipboardItem(item: unknown): item is ClipboardItemRow {
  if (!item || typeof item !== 'object') return false
  const o = item as Record<string, unknown>
  return (
    typeof o.id === 'number' &&
    typeof o.content_type === 'string' &&
    ['text', 'image'].includes(o.content_type) &&
    typeof o.content_hash === 'string' &&
    typeof o.is_pinned === 'number' &&
    typeof o.created_at === 'number'
  )
}

function isValidMemoItem(item: unknown): item is MemoRow {
  if (!item || typeof item !== 'object') return false
  const o = item as Record<string, unknown>
  return (
    typeof o.id === 'number' &&
    typeof o.title === 'string' &&
    typeof o.remind_at === 'number' &&
    typeof o.is_completed === 'number' &&
    typeof o.created_at === 'number'
  )
}

function isValidSettings(settings: unknown): settings is ExportData['settings'] {
  if (!settings || typeof settings !== 'object') return false
  const o = settings as Record<string, unknown>
  return (
    (o.theme === undefined || ['dark', 'light'].includes(o.theme as string)) &&
    (o.autoLaunch === undefined || typeof o.autoLaunch === 'boolean') &&
    (o.historyLimit === undefined || typeof o.historyLimit === 'number') &&
    (o.shortcut === undefined || typeof o.shortcut === 'string') &&
    (o.temperatureUnit === undefined ||
      o.temperatureUnit === 'celsius' ||
      o.temperatureUnit === 'fahrenheit') &&
    (o.weatherLocation === undefined ||
      (typeof o.weatherLocation === 'object' &&
        o.weatherLocation !== null &&
        typeof (o.weatherLocation as Record<string, unknown>).lat === 'number' &&
        typeof (o.weatherLocation as Record<string, unknown>).lon === 'number' &&
        typeof (o.weatherLocation as Record<string, unknown>).name === 'string'))
  )
}

export async function exportData(): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: '导出数据',
    defaultPath: `clipmaster-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  try {
    const db = getDB()

    const clipboardItems = db.prepare('SELECT * FROM clipboard_items').all()
    const memos = db.prepare('SELECT * FROM memos').all()

    const exportData: ExportData = {
      version: '1.0',
      exportedAt: Date.now(),
      clipboardItems,
      memos,
      settings: readStoredSettings()
    }

    fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8')
    return result.filePath
  } catch (err) {
    console.error('[ClipMaster] Export failed:', err)
    throw err
  }
}

export async function importData(): Promise<{ success: boolean; message: string }> {
  const result = await dialog.showOpenDialog({
    title: '导入数据',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, message: '已取消' }
  }

  const filePath = result.filePaths[0]

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content) as ExportData

    if (!data.version || !data.exportedAt) {
      return { success: false, message: '无效的备份文件格式' }
    }

    const db = getDB()

    const validItems = Array.isArray(data.clipboardItems)
      ? data.clipboardItems.filter(isValidClipboardItem)
      : []
    const validMemos = Array.isArray(data.memos) ? data.memos.filter(isValidMemoItem) : []

    const runImport = db.transaction(() => {
      if (validItems.length > 0) {
        const insertItem = db.prepare(`
          INSERT OR REPLACE INTO clipboard_items
          (id, content_type, content_category, text_content, image_data, content_hash, is_pinned, created_at, shortcut)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (const item of validItems) {
          insertItem.run(
            item.id,
            item.content_type,
            item.content_category,
            item.text_content,
            item.image_data,
            item.content_hash,
            item.is_pinned,
            item.created_at,
            item.shortcut
          )
        }
      }

      if (validMemos.length > 0) {
        const insertMemo = db.prepare(`
          INSERT OR REPLACE INTO memos
          (id, title, content, remind_at, is_completed, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `)

        for (const memo of validMemos) {
          insertMemo.run(
            memo.id,
            memo.title,
            memo.content,
            memo.remind_at,
            memo.is_completed,
            memo.created_at
          )
        }
      }

      if (isValidSettings(data.settings)) {
        writeStoredSettings(data.settings)
      }
    })

    runImport()

    const skippedItems = (data.clipboardItems?.length || 0) - validItems.length
    const skippedMemos = (data.memos?.length || 0) - validMemos.length
    const skippedMsg =
      skippedItems + skippedMemos > 0
        ? `（跳过 ${skippedItems} 条无效剪贴板记录和 ${skippedMemos} 条无效备忘录）`
        : ''

    return {
      success: true,
      message: `成功导入 ${validItems.length} 条剪贴板记录和 ${validMemos.length} 条备忘录${skippedMsg}`
    }
  } catch (err) {
    console.error('[ClipMaster] Import failed:', err)
    return { success: false, message: `导入失败: ${err}` }
  }
}
