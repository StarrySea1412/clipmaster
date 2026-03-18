import type Database from 'better-sqlite3'
import { Notification } from 'electron'

export interface MemoItem {
  id: number
  title: string
  content: string
  remindAt: number
  isCompleted: boolean
  createdAt: number
}

export interface MemoItemRow {
  id: number
  title: string
  content: string
  remind_at: number
  is_completed: number
  created_at: number
}

let stmtGetMemos: Database.Statement
let stmtGetPendingMemos: Database.Statement
let stmtInsertMemo: Database.Statement
let stmtUpdateMemo: Database.Statement
let stmtDeleteMemo: Database.Statement
let stmtCompleteMemo: Database.Statement
let stmtUncompleteMemo: Database.Statement
let stmtGetMemoById: Database.Statement

const scheduledTimers: Map<number, NodeJS.Timeout> = new Map()

function rowToMemo(row: MemoItemRow): MemoItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    remindAt: row.remind_at,
    isCompleted: row.is_completed === 1,
    createdAt: row.created_at
  }
}

export function initMemoTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      remind_at INTEGER NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_memos_remind_at ON memos(remind_at);
    CREATE INDEX IF NOT EXISTS idx_memos_is_completed ON memos(is_completed);
  `)
}

export function prepareMemoStatements(db: Database.Database): void {
  stmtGetMemos = db.prepare('SELECT * FROM memos ORDER BY remind_at ASC')

  stmtGetPendingMemos = db.prepare(
    'SELECT * FROM memos WHERE is_completed = 0 AND remind_at > ? ORDER BY remind_at ASC'
  )

  stmtInsertMemo = db.prepare(
    'INSERT INTO memos (title, content, remind_at, created_at) VALUES (?, ?, ?, ?)'
  )

  stmtUpdateMemo = db.prepare('UPDATE memos SET title = ?, content = ?, remind_at = ? WHERE id = ?')

  stmtDeleteMemo = db.prepare('DELETE FROM memos WHERE id = ?')

  stmtCompleteMemo = db.prepare('UPDATE memos SET is_completed = 1 WHERE id = ?')
  stmtUncompleteMemo = db.prepare('UPDATE memos SET is_completed = 0 WHERE id = ?')
  stmtGetMemoById = db.prepare('SELECT * FROM memos WHERE id = ?')
}

export function getMemos(): MemoItem[] {
  const rows = stmtGetMemos.all() as MemoItemRow[]
  return rows.map(rowToMemo)
}

export function getPendingMemos(): MemoItem[] {
  const now = Date.now()
  const rows = stmtGetPendingMemos.all(now) as MemoItemRow[]
  return rows.map(rowToMemo)
}

export function insertMemo(title: string, content: string, remindAt: number): MemoItem {
  const now = Date.now()
  const result = stmtInsertMemo.run(title, content, remindAt, now)
  const memo: MemoItem = {
    id: result.lastInsertRowid as number,
    title,
    content,
    remindAt,
    isCompleted: false,
    createdAt: now
  }
  scheduleMemoNotification(memo)
  return memo
}

export function updateMemo(
  id: number,
  title: string,
  content: string,
  remindAt: number
): MemoItem | null {
  stmtUpdateMemo.run(title, content, remindAt, id)
  cancelMemoNotification(id)
  const memos = getMemos()
  const memo = memos.find((m) => m.id === id)
  if (memo && !memo.isCompleted) {
    scheduleMemoNotification(memo)
  }
  return memo || null
}

export function deleteMemo(id: number): boolean {
  cancelMemoNotification(id)
  const result = stmtDeleteMemo.run(id)
  return result.changes > 0
}

export function completeMemo(id: number): boolean {
  const row = stmtGetMemoById.get(id) as MemoItemRow | undefined
  if (!row) return false

  const currentStatus = row.is_completed === 1
  const newStatus = !currentStatus

  if (newStatus) {
    cancelMemoNotification(id)
    stmtCompleteMemo.run(id)
  } else {
    stmtUncompleteMemo.run(id)
  }

  return true
}

function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      silent: false
    })
    notification.show()
  }
}

export function scheduleMemoNotification(memo: MemoItem): void {
  if (memo.isCompleted) return

  const delay = memo.remindAt - Date.now()
  if (delay <= 0) return

  if (scheduledTimers.has(memo.id)) {
    clearTimeout(scheduledTimers.get(memo.id)!)
  }

  const timer = setTimeout(() => {
    showNotification(memo.title, memo.content || '备忘录提醒')
    scheduledTimers.delete(memo.id)
    completeMemo(memo.id)
  }, delay)

  scheduledTimers.set(memo.id, timer)
  console.log('[ClipMaster] Scheduled memo notification:', memo.id, 'in', delay, 'ms')
}

export function cancelMemoNotification(id: number): void {
  if (scheduledTimers.has(id)) {
    clearTimeout(scheduledTimers.get(id)!)
    scheduledTimers.delete(id)
    console.log('[ClipMaster] Cancelled memo notification:', id)
  }
}

export function scheduleAllPendingMemos(): void {
  const memos = getPendingMemos()
  console.log('[ClipMaster] Scheduling', memos.length, 'pending memos')
  for (const memo of memos) {
    scheduleMemoNotification(memo)
  }
}

export function clearAllMemoTimers(): void {
  for (const timer of scheduledTimers.values()) {
    clearTimeout(timer)
  }
  scheduledTimers.clear()
}
