import type { ClipboardAPI } from '../../../shared/types'

declare global {
  interface Window {
    clipboardAPI: ClipboardAPI
  }
}
