import { app } from 'electron'
import fs from 'fs'
import { dirname, join } from 'path'
import type { Theme } from '../shared/types'

const DATABASE_FILE = 'clipmaster.db'
const SETTINGS_FILE = 'settings.json'
const LEGACY_SETTINGS_FILE = 'app-settings.json'

export interface StoredWeatherLocation {
  lat: number
  lon: number
  name: string
}

export interface StoredSettings {
  theme?: Theme
  autoLaunch?: boolean
  historyLimit?: number
  shortcut?: string
  weatherLocation?: StoredWeatherLocation
  temperatureUnit?: 'celsius' | 'fahrenheit'
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function readJSONRecord(filePath: string): Record<string, unknown> {
  try {
    if (!fs.existsSync(filePath)) {
      return {}
    }

    const value = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  } catch (err) {
    console.error('[ClipMaster] Failed to read JSON file:', filePath, err)
    return {}
  }
}

function copyDatabaseBundle(sourceDBPath: string, targetDBPath: string): void {
  const suffixes = ['', '-wal', '-shm']
  ensureDir(dirname(targetDBPath))

  for (const suffix of suffixes) {
    const sourcePath = `${sourceDBPath}${suffix}`
    const targetPath = `${targetDBPath}${suffix}`

    if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath)
    }
  }
}

function getLegacyDatabaseCandidates(): string[] {
  return [
    join(process.cwd(), 'data', DATABASE_FILE),
    join(app.getPath('temp'), 'clipmaster', DATABASE_FILE)
  ]
}

export function getUserDataDir(): string {
  const dirPath = app.getPath('userData')
  ensureDir(dirPath)
  return dirPath
}

export function getDatabasePath(): string {
  return join(getUserDataDir(), DATABASE_FILE)
}

export function prepareDatabasePath(): string {
  const targetDBPath = getDatabasePath()

  if (fs.existsSync(targetDBPath)) {
    return targetDBPath
  }

  for (const legacyDBPath of getLegacyDatabaseCandidates()) {
    if (!fs.existsSync(legacyDBPath)) {
      continue
    }

    try {
      copyDatabaseBundle(legacyDBPath, targetDBPath)
      console.log('[ClipMaster] Migrated legacy database to userData:', legacyDBPath)
      break
    } catch (err) {
      console.error('[ClipMaster] Failed to migrate legacy database:', legacyDBPath, err)
    }
  }

  return targetDBPath
}

export function getSettingsPath(): string {
  return join(getUserDataDir(), SETTINGS_FILE)
}

function getLegacySettingsPath(): string {
  return join(getUserDataDir(), LEGACY_SETTINGS_FILE)
}

export function readStoredSettings(): StoredSettings {
  const legacySettings = readJSONRecord(getLegacySettingsPath())
  const currentSettings = readJSONRecord(getSettingsPath())

  return {
    ...legacySettings,
    ...currentSettings
  } as StoredSettings
}

export function writeStoredSettings(settings: StoredSettings): void {
  const filePath = getSettingsPath()
  ensureDir(dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8')
}

export function updateStoredSettings(patch: Partial<StoredSettings>): StoredSettings {
  const nextSettings = {
    ...readStoredSettings(),
    ...patch
  }

  writeStoredSettings(nextSettings)
  return nextSettings
}
