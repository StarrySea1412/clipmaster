import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import path from 'path'

export interface MemoryUsage {
  database: number
  images: number
  cache: number
  logs: number
  settings: number
  total: number
  appMemory: number
}

function getDirectorySize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0

  let totalSize = 0

  function calculateSize(currentPath: string): void {
    try {
      const stats = fs.statSync(currentPath)
      if (stats.isDirectory()) {
        const files = fs.readdirSync(currentPath)
        for (const file of files) {
          calculateSize(path.join(currentPath, file))
        }
      } else {
        totalSize += stats.size
      }
    } catch {
      // Ignore errors
    }
  }

  calculateSize(dirPath)
  return totalSize
}

function getFileSize(filePath: string): number {
  try {
    if (fs.existsSync(filePath)) {
      return fs.statSync(filePath).size
    }
  } catch {
    // Ignore errors
  }
  return 0
}

export function getMemoryUsage(): MemoryUsage {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'clipmaster.db')
  const dbWalPath = join(userDataPath, 'clipmaster.db-wal')
  const dbShmPath = join(userDataPath, 'clipmaster.db-shm')
  const imagesPath = join(userDataPath, 'images')
  const cachePath = join(userDataPath, 'Cache')
  const codeCachePath = join(userDataPath, 'Code Cache')
  const gpuCachePath = join(userDataPath, 'GPUCache')
  const settingsPath = join(userDataPath, 'settings.json')

  const databaseSize = getFileSize(dbPath) + getFileSize(dbWalPath) + getFileSize(dbShmPath)
  const imagesSize = getDirectorySize(imagesPath)
  const cacheSize =
    getDirectorySize(cachePath) + getDirectorySize(codeCachePath) + getDirectorySize(gpuCachePath)
  const settingsSize = getFileSize(settingsPath)

  const total = databaseSize + imagesSize + cacheSize + settingsSize

  const appMemory = process.memoryUsage().heapUsed

  return {
    database: databaseSize,
    images: imagesSize,
    cache: cacheSize,
    logs: 0,
    settings: settingsSize,
    total,
    appMemory
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function clearCache(): void {
  const userDataPath = app.getPath('userData')
  const cachePath = join(userDataPath, 'Cache')
  const codeCachePath = join(userDataPath, 'Code Cache')
  const gpuCachePath = join(userDataPath, 'GPUCache')

  function deleteDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) return
    try {
      const files = fs.readdirSync(dirPath)
      for (const file of files) {
        const filePath = path.join(dirPath, file)
        try {
          if (fs.statSync(filePath).isDirectory()) {
            deleteDirectory(filePath)
            fs.rmdirSync(filePath)
          } else {
            fs.unlinkSync(filePath)
          }
        } catch {
          // Ignore errors
        }
      }
    } catch {
      // Ignore errors
    }
  }

  deleteDirectory(cachePath)
  deleteDirectory(codeCachePath)
  deleteDirectory(gpuCachePath)
}
