export interface ClipboardItem {
  id: number
  contentType: 'text' | 'image'
  textContent: string | null
  imagePath: string | null
  contentHash: string
  isPinned: boolean
  createdAt: number
}

export interface ClipboardAPI {
  getItems(options?: { search?: string; limit?: number; offset?: number }): Promise<ClipboardItem[]>
  getItemById(id: number): Promise<ClipboardItem | undefined>
  togglePin(id: number): Promise<ClipboardItem | undefined>
  deleteItem(id: number): Promise<boolean>
  clearHistory(keepPinned: boolean): Promise<void>
  copyToClipboard(id: number): Promise<boolean>
  getImageData(imagePath: string): Promise<string | null>
  hideWindow(): void
  onNewItem(callback: (item: ClipboardItem) => void): void
  onHistoryCleared(callback: () => void): void
  removeAllListeners(): void
}

declare global {
  interface Window {
    clipboardAPI: ClipboardAPI
  }
}
