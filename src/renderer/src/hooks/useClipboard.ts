import { useState, useEffect, useCallback, useRef } from 'react'
import type { ClipboardItem, ContentCategory } from '../types'

interface UseClipboardReturn {
  items: ClipboardItem[]
  isLoading: boolean
  searchValue: string
  setSearchValue: (value: string) => void
  activeCategory: ContentCategory | null
  setActiveCategory: (category: ContentCategory | null) => void
  copyToClipboard: (id: number) => Promise<void>
  togglePin: (id: number) => Promise<void>
  deleteItem: (id: number) => Promise<void>
  clearHistory: () => Promise<void>
  refresh: () => Promise<void>
  toastMessage: string | null
}

export function useClipboard(): UseClipboardReturn {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [activeCategory, setActiveCategory] = useState<ContentCategory | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const api = window.clipboardAPI

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMessage(null), 1500)
  }, [])

  const fetchItems = useCallback(
    async (search?: string, category?: ContentCategory | null) => {
      if (!api) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const result = await api.getItems({
          search: search || undefined,
          limit: 30,
          category: category ?? undefined
        })
        setItems(result)
      } catch (err) {
        console.error('Failed to fetch clipboard items:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [api]
  )

  useEffect(() => {
    fetchItems(searchValue, activeCategory)
  }, [fetchItems, searchValue, activeCategory])

  const activeCategoryRef = useRef(activeCategory)
  activeCategoryRef.current = activeCategory

  useEffect(() => {
    if (!api) return

    api.onNewItem((item: ClipboardItem) => {
      const filter = activeCategoryRef.current
      if (filter && item.category !== filter) return

      setItems((prev) => {
        const existingIndex = prev.findIndex((i) => i.id === item.id)
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = item
          return updated
        }
        const pinned = prev.filter((i) => i.isPinned)
        const unpinned = prev.filter((i) => !i.isPinned)
        const newUnpinned = [item, ...unpinned].slice(0, 99)
        return [...pinned, ...newUnpinned]
      })
    })

    api.onHistoryCleared(() => {
      setItems((prev) => prev.filter((i) => i.isPinned))
    })

    return () => {
      api.removeAllListeners()
    }
  }, [api])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const handleSetSearchValue = useCallback(
    (value: string) => {
      setSearchValue(value)
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      debounceTimer.current = setTimeout(() => {
        fetchItems(value, activeCategory)
      }, 300)
    },
    [fetchItems, activeCategory]
  )

  const copyToClipboard = useCallback(
    async (id: number) => {
      if (!api) return
      const success = await api.copyToClipboard(id)
      if (success) {
        showToast('已复制到剪贴板')
      }
    },
    [api, showToast]
  )

  const togglePin = useCallback(
    async (id: number) => {
      if (!api) return
      const updated = await api.togglePin(id)
      if (updated) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isPinned: updated.isPinned } : item))
        )
        showToast(updated.isPinned ? '已置顶' : '已取消置顶')
      }
    },
    [api, showToast]
  )

  const deleteItem = useCallback(
    async (id: number) => {
      if (!api) return
      const success = await api.deleteItem(id)
      if (success) {
        setItems((prev) => prev.filter((item) => item.id !== id))
      }
    },
    [api]
  )

  const clearHistoryFn = useCallback(async () => {
    if (!api) return
    await api.clearHistory(true)
    setItems((prev) => prev.filter((i) => i.isPinned))
    showToast('历史已清空')
  }, [api, showToast])

  return {
    items,
    isLoading,
    searchValue,
    setSearchValue: handleSetSearchValue,
    activeCategory,
    setActiveCategory,
    copyToClipboard,
    togglePin,
    deleteItem,
    clearHistory: clearHistoryFn,
    refresh: () => fetchItems(searchValue, activeCategory),
    toastMessage
  }
}
