import Database from 'better-sqlite3'
import { app } from 'electron'
import { join, dirname } from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { classifyContent } from '../shared/classifier'
import type { ContentCategory } from '../shared/types'
import { initMemoTables, prepareMemoStatements, scheduleAllPendingMemos } from './memo'

let db: Database.Database
let dataDir: string = ''

let stmtInsertText: Database.Statement
let stmtInsertImage: Database.Statement
let stmtGetImageData: Database.Statement
let stmtGetItems: Database.Statement
let stmtGetItemsSearch: Database.Statement
let stmtGetItemsByCategory: Database.Statement
let stmtGetItemsByCategorySearch: Database.Statement
let stmtGetById: Database.Statement
let stmtTogglePin: Database.Statement
let stmtDeleteById: Database.Statement
let stmtLastHash: Database.Statement
let stmtCountUnpinned: Database.Statement
let stmtSetShortcut: Database.Statement
let stmtGetByShortcut: Database.Statement
let stmtClearShortcut: Database.Statement

export function getDataDir(): string {
  return dataDir
}

export function getDB(): Database.Database {
  return db
}

export interface ClipboardItemRow {
  id: number
  content_type: string
  content_category: string
  text_content: string | null
  image_data: Buffer | null
  content_hash: string
  is_pinned: number
  created_at: number
  shortcut: string | null
  size_bytes: number
}

export type { ClipboardItem } from '../shared/types'
import type { ClipboardItem } from '../shared/types'

export interface GetItemsOptions {
  search?: string
  limit?: number
  offset?: number
  category?: ContentCategory
}

function rowToItem(row: ClipboardItemRow): ClipboardItem {
  return {
    id: row.id,
    contentType: row.content_type as 'text' | 'image',
    category: (row.content_category || 'text') as ContentCategory,
    textContent: row.text_content,
    imageData: row.image_data
      ? `data:image/png;base64,${row.image_data.toString('base64')}`
      : undefined,
    contentHash: row.content_hash,
    isPinned: row.is_pinned === 1,
    createdAt: row.created_at,
    shortcut: row.shortcut || undefined,
    sizeBytes: row.size_bytes || 0
  }
}

const SELECT_COLS = `id, content_type, content_category,
  CASE WHEN LENGTH(text_content) > 500 THEN SUBSTR(text_content, 1, 500) || '...' ELSE text_content END as text_content,
  NULL as image_data, content_hash, is_pinned, created_at, shortcut,
  COALESCE(LENGTH(text_content), LENGTH(image_data), 0) as size_bytes`

export function initDB(): void {
  let dbPath: string

  const possiblePaths = [
    () => {
      const p = join(process.cwd(), 'data')
      return { dbPath: join(p, 'clipmaster.db') }
    },
    () => {
      const p = app.getPath('temp')
      return { dbPath: join(p, 'clipmaster', 'clipmaster.db') }
    },
    () => {
      const p = app.getPath('userData')
      return { dbPath: join(p, 'clipmaster.db') }
    }
  ]

  let opened = false
  for (const getPath of possiblePaths) {
    try {
      const result = getPath()
      dbPath = result.dbPath

      const dbDir = dirname(dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      console.log('[ClipMaster] Trying database path:', dbPath)
      db = new Database(dbPath)
      dataDir = dirname(dbPath)
      console.log('[ClipMaster] Database opened successfully at:', dbPath)
      opened = true
      break
    } catch (err) {
      console.error('[ClipMaster] Failed at path:', err)
    }
  }

  if (!opened) {
    console.log('[ClipMaster] Falling back to in-memory database')
    db = new Database(':memory:')
  }

  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS clipboard_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_type TEXT NOT NULL DEFAULT 'text',
      content_category TEXT NOT NULL DEFAULT 'text',
      text_content TEXT,
      image_data BLOB,
      content_hash TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_content_hash ON clipboard_items(content_hash);
    CREATE INDEX IF NOT EXISTS idx_created_at ON clipboard_items(created_at);
    CREATE INDEX IF NOT EXISTS idx_is_pinned ON clipboard_items(is_pinned);
  `)

  const columns = db.prepare('PRAGMA table_info(clipboard_items)').all() as { name: string }[]
  if (!columns.some((col) => col.name === 'image_data')) {
    db.exec('ALTER TABLE clipboard_items ADD COLUMN image_data BLOB')
  }
  if (!columns.some((col) => col.name === 'content_category')) {
    db.exec("ALTER TABLE clipboard_items ADD COLUMN content_category TEXT NOT NULL DEFAULT 'text'")
  }
  if (!columns.some((col) => col.name === 'shortcut')) {
    db.exec('ALTER TABLE clipboard_items ADD COLUMN shortcut TEXT')
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_content_category ON clipboard_items(content_category)')

  initMemoTables(db)
  migrateCategories()
  prepareStatements()
  prepareMemoStatements(db)
  scheduleAllPendingMemos()
}

function migrateCategories(): void {
  const unclassified = db
    .prepare(
      "SELECT id, text_content FROM clipboard_items WHERE content_category = 'text' AND content_type = 'text' AND text_content IS NOT NULL"
    )
    .all() as { id: number; text_content: string }[]

  if (unclassified.length === 0) return

  const update = db.prepare('UPDATE clipboard_items SET content_category = ? WHERE id = ?')
  const migrate = db.transaction(() => {
    let changed = 0
    for (const row of unclassified) {
      const cat = classifyContent(row.text_content)
      if (cat !== 'text') {
        update.run(cat, row.id)
        changed++
      }
    }
    if (changed > 0) {
      console.log(`[ClipMaster] Migrated categories for ${changed} existing items`)
    }
  })
  migrate()

  const imgRows = db
    .prepare(
      "SELECT id FROM clipboard_items WHERE content_type = 'image' AND content_category = 'text'"
    )
    .all() as { id: number }[]
  if (imgRows.length > 0) {
    const fixImg = db.prepare(
      "UPDATE clipboard_items SET content_category = 'image' WHERE content_type = 'image' AND content_category = 'text'"
    )
    fixImg.run()
    console.log(`[ClipMaster] Fixed category for ${imgRows.length} image items`)
  }
}

function prepareStatements(): void {
  stmtInsertText = db.prepare(
    `INSERT INTO clipboard_items (content_type, content_category, text_content, content_hash, created_at)
     VALUES ('text', ?, ?, ?, ?)`
  )

  stmtInsertImage = db.prepare(
    `INSERT INTO clipboard_items (content_type, content_category, image_data, content_hash, created_at)
     VALUES ('image', 'image', ?, ?, ?)`
  )

  stmtGetImageData = db.prepare('SELECT image_data FROM clipboard_items WHERE id = ?')

  stmtGetItems = db.prepare(
    `SELECT ${SELECT_COLS} FROM clipboard_items
     ORDER BY is_pinned DESC, created_at DESC
     LIMIT ? OFFSET ?`
  )

  stmtGetItemsSearch = db.prepare(
    `SELECT ${SELECT_COLS} FROM clipboard_items
     WHERE content_type = 'text' AND text_content LIKE ?
     ORDER BY is_pinned DESC, created_at DESC
     LIMIT ? OFFSET ?`
  )

  stmtGetItemsByCategory = db.prepare(
    `SELECT ${SELECT_COLS} FROM clipboard_items
     WHERE content_category = ?
     ORDER BY is_pinned DESC, created_at DESC
     LIMIT ? OFFSET ?`
  )

  stmtGetItemsByCategorySearch = db.prepare(
    `SELECT ${SELECT_COLS} FROM clipboard_items
     WHERE content_category = ? AND content_type = 'text' AND text_content LIKE ?
     ORDER BY is_pinned DESC, created_at DESC
     LIMIT ? OFFSET ?`
  )

  stmtGetById = db.prepare('SELECT * FROM clipboard_items WHERE id = ?')

  stmtTogglePin = db.prepare(
    'UPDATE clipboard_items SET is_pinned = CASE WHEN is_pinned = 0 THEN 1 ELSE 0 END WHERE id = ?'
  )

  stmtDeleteById = db.prepare('DELETE FROM clipboard_items WHERE id = ?')

  stmtLastHash = db.prepare(
    'SELECT content_hash FROM clipboard_items ORDER BY created_at DESC LIMIT 20'
  )

  stmtCountUnpinned = db.prepare('SELECT COUNT(*) as cnt FROM clipboard_items WHERE is_pinned = 0')

  stmtSetShortcut = db.prepare('UPDATE clipboard_items SET shortcut = ? WHERE id = ?')
  stmtGetByShortcut = db.prepare('SELECT * FROM clipboard_items WHERE shortcut = ?')
  stmtClearShortcut = db.prepare('UPDATE clipboard_items SET shortcut = NULL WHERE shortcut = ?')
}

export function insertItem(textContent: string, hash: string): ClipboardItem {
  const now = Date.now()
  const category = classifyContent(textContent)
  const result = stmtInsertText.run(category, textContent, hash, now)

  return {
    id: result.lastInsertRowid as number,
    contentType: 'text',
    category,
    textContent: textContent.length > 500 ? textContent.slice(0, 500) : textContent,
    imageData: undefined,
    contentHash: hash,
    isPinned: false,
    createdAt: now
  }
}

export function insertImageItem(imageBuffer: Buffer, hash: string): ClipboardItem {
  const now = Date.now()
  const result = stmtInsertImage.run(imageBuffer, hash, now)

  return {
    id: result.lastInsertRowid as number,
    contentType: 'image',
    category: 'image',
    textContent: null,
    imageData: `data:image/png;base64,${imageBuffer.toString('base64')}`,
    contentHash: hash,
    isPinned: false,
    createdAt: now
  }
}

export function getImageDataById(id: number): Buffer | null {
  const row = stmtGetImageData.get(id) as { image_data: Buffer | null } | undefined
  return row?.image_data ?? null
}

export function getItems(options: GetItemsOptions = {}): ClipboardItem[] {
  const { search, limit = 50, offset = 0, category } = options

  let rows: ClipboardItemRow[]

  if (category && search && search.trim()) {
    rows = stmtGetItemsByCategorySearch.all(
      category,
      `%${search.trim()}%`,
      limit,
      offset
    ) as ClipboardItemRow[]
  } else if (category) {
    rows = stmtGetItemsByCategory.all(category, limit, offset) as ClipboardItemRow[]
  } else if (search && search.trim()) {
    rows = stmtGetItemsSearch.all(`%${search.trim()}%`, limit, offset) as ClipboardItemRow[]
  } else {
    rows = stmtGetItems.all(limit, offset) as ClipboardItemRow[]
  }

  return rows.map(rowToItem)
}

export function getItemById(id: number): ClipboardItem | undefined {
  const row = stmtGetById.get(id) as ClipboardItemRow | undefined
  if (!row) return undefined
  return rowToItem(row)
}

export function togglePin(id: number): ClipboardItem | undefined {
  stmtTogglePin.run(id)
  return getItemById(id)
}

export function setShortcut(id: number, shortcut: string | null): ClipboardItem | undefined {
  if (shortcut) {
    stmtClearShortcut.run(shortcut)
    stmtSetShortcut.run(shortcut, id)
  } else {
    stmtSetShortcut.run(null, id)
  }
  return getItemById(id)
}

export function getItemByShortcut(shortcut: string): ClipboardItem | undefined {
  const row = stmtGetByShortcut.get(shortcut) as ClipboardItemRow | undefined
  return row ? rowToItem(row) : undefined
}

export function getItemsWithShortcuts(): ClipboardItem[] {
  const rows = db
    .prepare(
      `SELECT ${SELECT_COLS} FROM clipboard_items WHERE shortcut IS NOT NULL ORDER BY created_at DESC`
    )
    .all() as ClipboardItemRow[]
  return rows.map(rowToItem)
}

export function updateItemContent(id: number, content: string): ClipboardItem | undefined {
  const hash = computeHash(content)
  const category = classifyContent(content)
  db.prepare(
    `UPDATE clipboard_items SET text_content = ?, content_hash = ?, content_category = ? WHERE id = ?`
  ).run(content, hash, category, id)
  return getItemById(id)
}

export function deleteItem(id: number): boolean {
  const result = stmtDeleteById.run(id)
  return result.changes > 0
}

export function clearHistory(keepPinned: boolean): void {
  if (keepPinned) {
    db.prepare('DELETE FROM clipboard_items WHERE is_pinned = 0').run()
  } else {
    db.prepare('DELETE FROM clipboard_items').run()
  }
}

export function isDuplicate(hash: string): boolean {
  const rows = stmtLastHash.all() as { content_hash: string }[]
  return rows.some((row) => row.content_hash === hash)
}

export function enforceHistoryLimit(limit: number = 1000): void {
  const count = (stmtCountUnpinned.get() as { cnt: number }).cnt

  if (count > limit) {
    db.prepare(
      `DELETE FROM clipboard_items
       WHERE is_pinned = 0 AND id NOT IN (
         SELECT id FROM clipboard_items WHERE is_pinned = 0
         ORDER BY created_at DESC LIMIT ?
       )`
    ).run(limit)
  }
}

export function computeHash(content: string | Buffer): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

export function closeDB(): void {
  if (db) {
    db.close()
  }
}
