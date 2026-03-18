import { clipboard } from 'electron'
import { EventEmitter } from 'events'
import { computeHash } from './database'

export interface ClipboardChangeEvent {
  type: 'text' | 'image'
  textContent?: string
  imageBuffer?: Buffer
  hash: string
}

const IDLE_THRESHOLD = 10
const MAX_POLL_INTERVAL = 3000
const THUMB_SIZE = 32

export class ClipboardWatcher extends EventEmitter {
  private timerId: ReturnType<typeof setTimeout> | null = null
  private lastHash: string = ''
  private paused: boolean = false
  private pollInterval: number
  private basePollInterval: number
  private idleCount: number = 0
  private windowVisible: boolean = true

  constructor(pollInterval: number = 1000) {
    super()
    this.basePollInterval = pollInterval
    this.pollInterval = pollInterval
  }

  setWindowVisible(visible: boolean): void {
    this.windowVisible = visible
    if (visible) {
      this.pollInterval = this.basePollInterval
      this.idleCount = 0
    } else {
      this.pollInterval = MAX_POLL_INTERVAL
    }
  }

  start(): void {
    if (this.timerId) return
    this.scheduleNext()
  }

  stop(): void {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  pause(ms: number): void {
    this.paused = true
    setTimeout(() => {
      this.paused = false
    }, ms)
  }

  private scheduleNext(): void {
    this.timerId = setTimeout(() => {
      if (!this.paused) {
        this.check()
      }
      this.scheduleNext()
    }, this.pollInterval)
  }

  private check(): void {
    try {
      const image = clipboard.readImage()
      if (image && !image.isEmpty()) {
        // Use 32x32 thumbnail bitmap (~4KB) for hash instead of full toPNG() (~1-5MB)
        const thumb = image.resize({ width: THUMB_SIZE, height: THUMB_SIZE })
        const hash = computeHash(thumb.toBitmap())

        if (hash === this.lastHash) {
          this.tickIdle()
          return
        }

        this.lastHash = hash
        this.resetIdle()

        // Only create full PNG buffer when image actually changed
        const pngBuffer = image.toPNG()
        this.emit('change', {
          type: 'image',
          imageBuffer: pngBuffer,
          hash
        } as ClipboardChangeEvent)
        return
      }

      const text = clipboard.readText()
      if (!text || !text.trim()) {
        this.tickIdle()
        return
      }

      const hash = computeHash(text)
      if (hash === this.lastHash) {
        this.tickIdle()
        return
      }

      this.lastHash = hash
      this.resetIdle()
      this.emit('change', {
        type: 'text',
        textContent: text,
        hash
      } as ClipboardChangeEvent)
    } catch (err) {
      console.error('[ClipMaster] Clipboard check error:', err)
    }
  }

  private resetIdle(): void {
    this.idleCount = 0
    if (this.windowVisible) {
      this.pollInterval = this.basePollInterval
    }
  }

  private tickIdle(): void {
    this.idleCount++
    if (this.idleCount > IDLE_THRESHOLD) {
      this.pollInterval = Math.min(this.pollInterval + 200, MAX_POLL_INTERVAL)
    }
  }
}
