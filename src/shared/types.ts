export type ContentCategory = 'text' | 'code' | 'link' | 'color' | 'email' | 'image'

export interface ClipboardItem {
  id: number
  contentType: 'text' | 'image'
  category: ContentCategory
  textContent: string | null
  imageData?: string
  contentHash: string
  isPinned: boolean
  createdAt: number
  shortcut?: string
  sizeBytes?: number
}

export interface WeatherData {
  temperature: number
  weatherCode: number
  humidity: number
  windSpeed: number
  location: string
  updatedAt: number
}

export interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country: string
  admin1?: string
}

export interface MemoItem {
  id: number
  title: string
  content: string
  remindAt: number
  isCompleted: boolean
  createdAt: number
}

export type Theme = 'dark' | 'light'

export interface ClipboardAPI {
  getItems(options?: {
    search?: string
    limit?: number
    offset?: number
    category?: ContentCategory
  }): Promise<ClipboardItem[]>
  getItemById(id: number): Promise<ClipboardItem | undefined>
  getImageData(id: number): Promise<string | null>
  togglePin(id: number): Promise<ClipboardItem | undefined>
  deleteItem(id: number): Promise<boolean>
  clearHistory(keepPinned: boolean): Promise<void>
  copyToClipboard(id: number): Promise<boolean>
  openUrl(url: string): Promise<boolean>
  hideWindow(): void
  getShortcut(): Promise<string>
  setShortcut(shortcut: string): Promise<boolean>
  setItemShortcut(id: number, shortcut: string | null): Promise<ClipboardItem | null>
  getItemByShortcut(shortcut: string): Promise<ClipboardItem | null>
  getItemsWithShortcuts(): Promise<ClipboardItem[]>
  getTheme(): Promise<Theme>
  setTheme(theme: Theme): Promise<void>
  getAutoLaunch(): Promise<boolean>
  setAutoLaunch(enabled: boolean): Promise<void>
  getHistoryLimit(): Promise<number>
  setHistoryLimit(limit: number): Promise<void>
  updateItemContent(id: number, content: string): Promise<ClipboardItem | null>
  exportData(): Promise<string | null>
  importData(): Promise<{ success: boolean; message: string }>
  searchLocation(query: string): Promise<GeocodingResult[]>
  fetchWeather(): Promise<WeatherData | null>
  getWeatherLocation(): Promise<{ lat: number; lon: number; name: string } | null>
  setWeatherLocation(lat: number, lon: number, name: string): Promise<boolean>
  getTemperatureUnit(): Promise<'celsius' | 'fahrenheit'>
  setTemperatureUnit(unit: 'celsius' | 'fahrenheit'): Promise<boolean>
  getWeatherInfo(code: number): Promise<{ icon: string; description: string }>
  // Memo APIs
  getMemos(): Promise<MemoItem[]>
  createMemo(title: string, content: string, remindAt: number): Promise<MemoItem | null>
  updateMemo(id: number, title: string, content: string, remindAt: number): Promise<MemoItem | null>
  deleteMemo(id: number): Promise<boolean>
  completeMemo(id: number): Promise<boolean>
  // Memory APIs
  getMemoryUsage(): Promise<{
    database: string
    images: string
    cache: string
    logs: string
    settings: string
    total: string
    appMemory: string
    raw: {
      database: number
      images: number
      cache: number
      logs: number
      settings: number
      total: number
      appMemory: number
    }
  } | null>
  clearCache(): Promise<boolean>
  onNewItem(callback: (item: ClipboardItem) => void): void
  onHistoryCleared(callback: () => void): void
  removeAllListeners(): void
}
