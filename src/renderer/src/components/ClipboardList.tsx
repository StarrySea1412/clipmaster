import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import type { ClipboardItem } from '../../../shared/types'
import { classifyContent } from '../../../shared/classifier'
import {
  CloseIcon,
  ImageIcon,
  LinkIcon,
  CodeIcon,
  EmailIcon,
  ColorIcon,
  TextIcon,
  EditIcon,
  ShortcutIcon,
  PinIcon,
  TrashIcon,
  CopyIcon,
  WarningIcon
} from './Icons'

const TIME_CACHE_MAX = 500
const timeCache = new Map<number, { time: number; formatted: string }>()

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const cached = timeCache.get(timestamp)
  if (cached && now - cached.time < 60000) {
    return cached.formatted
  }
  if (timeCache.size >= TIME_CACHE_MAX) {
    const firstKey = timeCache.keys().next().value
    if (firstKey !== undefined) timeCache.delete(firstKey)
  }

  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  let result: string
  if (minutes < 1) result = '刚刚'
  else if (minutes < 60) result = `${minutes}分钟前`
  else if (hours < 24) result = `${hours}小时前`
  else if (days < 7) result = `${days}天前`
  else result = new Date(timestamp).toLocaleDateString('zh-CN')

  timeCache.set(timestamp, { time: now, formatted: result })
  return result
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ClipboardListProps {
  items: ClipboardItem[]
  onCopy: (id: number) => void
  onDelete: (id: number) => void
  onTogglePin: (id: number) => void
  onCreateMemo: (content: string) => void
  onItemUpdate?: () => void
}

interface ShortcutModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (shortcut: string | null) => void
  currentShortcut: string | undefined | null
  allItems: ClipboardItem[]
  currentItemId: number
}

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (content: string) => void
  currentContent: string
}

function EditModal({
  isOpen,
  onClose,
  onSave,
  currentContent
}: EditModalProps): React.ReactElement | null {
  const [content, setContent] = useState(currentContent)

  useEffect(() => {
    if (isOpen) {
      setContent(currentContent)
    }
  }, [isOpen, currentContent])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen, onClose])

  const handleSave = (): void => {
    onSave(content)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="shortcut-modal__overlay" onClick={handleOverlayClick}>
      <div className="shortcut-modal" style={{ width: '400px' }}>
        <div className="shortcut-modal__header">
          <span className="shortcut-modal__title">编辑内容</span>
          <button className="shortcut-modal__close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="shortcut-modal__content">
          <textarea
            className="edit-modal__textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入内容..."
            autoFocus
          />
        </div>

        <div className="shortcut-modal__footer">
          <button className="shortcut-modal__btn shortcut-modal__btn--secondary" onClick={onClose}>
            取消
          </button>
          <button className="shortcut-modal__btn shortcut-modal__btn--primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function ShortcutModal({
  isOpen,
  onClose,
  onSave,
  currentShortcut,
  allItems,
  currentItemId
}: ShortcutModalProps): React.ReactElement | null {
  const [shortcut, setShortcut] = useState(currentShortcut || '')
  const [isRecording, setIsRecording] = useState(false)
  const [conflictItem, setConflictItem] = useState<ClipboardItem | null>(null)

  useEffect(() => {
    if (isOpen) {
      setShortcut(currentShortcut || '')
      setIsRecording(false)
      setConflictItem(null)
    }
  }, [isOpen, currentShortcut])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      if (!isRecording) return

      e.preventDefault()
      e.stopPropagation()

      const keys: string[] = []
      if (e.ctrlKey) keys.push('Ctrl')
      if (e.altKey) keys.push('Alt')
      if (e.shiftKey) keys.push('Shift')
      if (e.metaKey) keys.push('Meta')

      if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') {
        return
      }

      const mainKey = e.key.toUpperCase()
      if (mainKey.length === 1 || mainKey === 'SPACE') {
        keys.push(mainKey === 'SPACE' ? 'Space' : mainKey)
      } else if (e.code.startsWith('Key')) {
        keys.push(e.code.replace('Key', ''))
      } else if (e.code.startsWith('Digit')) {
        keys.push(e.code.replace('Digit', ''))
      } else if (
        ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(e.code)
      ) {
        keys.push(e.code)
      } else {
        keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
      }

      if (keys.length > 1) {
        const newShortcut = keys.join('+')
        setShortcut(newShortcut)
        setIsRecording(false)

        const existing = allItems.find(
          (item) => item.id !== currentItemId && item.shortcut === newShortcut
        )
        setConflictItem(existing || null)
      }
    },
    [isRecording, allItems, currentItemId]
  )

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
    return undefined
  }, [isRecording, handleKeyDown])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen, onClose])

  const handleSave = (): void => {
    onSave(shortcut.trim() || null)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="shortcut-modal__overlay" onClick={handleOverlayClick}>
      <div className="shortcut-modal">
        <div className="shortcut-modal__header">
          <span className="shortcut-modal__title">设置快速粘贴快捷键</span>
          <button className="shortcut-modal__close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="shortcut-modal__content">
          <p className="shortcut-modal__hint">设置快捷键，按下后自动粘贴此内容</p>
          <div className="shortcut-modal__input-wrapper">
            <input
              type="text"
              className={`shortcut-modal__input ${isRecording ? 'shortcut-modal__input--recording' : ''}`}
              value={isRecording ? '请按下快捷键...' : shortcut}
              readOnly
              onClick={() => setIsRecording(true)}
              placeholder="如: Ctrl+Shift+1"
            />
            <button
              className="shortcut-modal__record-btn"
              onClick={() => setIsRecording(!isRecording)}
            >
              {isRecording ? '取消' : '录制'}
            </button>
          </div>
          {conflictItem && (
            <div className="shortcut-modal__conflict">
              <WarningIcon />
              <span>
                快捷键已与「{conflictItem.textContent?.slice(0, 20) || '图片'}
                ...」冲突，保存后将覆盖
              </span>
            </div>
          )}
        </div>

        <div className="shortcut-modal__footer">
          <button className="shortcut-modal__btn shortcut-modal__btn--secondary" onClick={onClose}>
            取消
          </button>
          <button className="shortcut-modal__btn shortcut-modal__btn--primary" onClick={handleSave}>
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

interface ClipboardItemCardProps {
  item: ClipboardItem
  items: ClipboardItem[]
  onCopy: (id: number) => void
  onTogglePin: (id: number) => void
  onDelete: (id: number) => void
  onEdit: (id: number, content: string) => void
  isFocused: boolean
  onContextMenu: (e: React.MouseEvent, itemId: number) => void
}

const ClipboardItemCard = memo(function ClipboardItemCard({
  item,
  items,
  onCopy,
  onTogglePin,
  onDelete,
  onEdit,
  isFocused,
  onContextMenu
}: ClipboardItemCardProps): React.ReactElement {
  const [showShortcutModal, setShowShortcutModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const elRef = useRef<HTMLDivElement>(null)
  const isVisibleRef = useRef(false)

  useEffect(() => {
    if (isFocused && elRef.current) {
      elRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [isFocused])

  useEffect(() => {
    if (item.contentType !== 'image') return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisibleRef.current) {
            isVisibleRef.current = true
            if (!imageData && !imageLoading) {
              setImageLoading(true)
              // 使用 requestIdleCallback 延迟加载，避免阻塞主线程
              const loadImage = (): void => {
                window.clipboardAPI.getImageData(item.id).then((data) => {
                  if (data) {
                    setImageData(data)
                  }
                  setImageLoading(false)
                })
              }
              if ('requestIdleCallback' in window) {
                window.requestIdleCallback(loadImage, { timeout: 100 })
              } else {
                setTimeout(loadImage, 0)
              }
            }
          }
        })
      },
      { rootMargin: '50px' }
    )

    if (elRef.current) {
      observer.observe(elRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [imageData, imageLoading, item.contentType, item.id])

  const handleSetShortcut = useCallback(
    async (shortcut: string | null): Promise<void> => {
      await window.clipboardAPI.setItemShortcut(item.id, shortcut)
    },
    [item.id]
  )

  const handleContextMenuLocal = useCallback(
    (e: React.MouseEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(e, item.id)
    },
    [onContextMenu, item.id]
  )

  const text = item.textContent || ''
  const category = useMemo(() => classifyContent(text), [text])

  const renderContent = useMemo((): React.ReactElement => {
    if (item.contentType === 'image') {
      return (
        <div className="clip-item__image-container">
          {imageLoading ? (
            <div className="clip-item__image-loading">
              <ImageIcon size={24} />
            </div>
          ) : imageData ? (
            <img src={imageData} alt="Clipboard image" className="clip-item__image" />
          ) : (
            <div className="clip-item__image-loading">
              <ImageIcon size={24} />
            </div>
          )}
        </div>
      )
    }

    const categoryClass = `clip-item__text--${category}`
    const isLink = category === 'link'
    const handleLinkClick = isLink
      ? (e: React.MouseEvent) => {
          e.stopPropagation()
          window.clipboardAPI.openUrl(text)
        }
      : undefined

    return (
      <div
        className={`clip-item__text ${categoryClass}`}
        onClick={handleLinkClick}
        style={isLink ? { cursor: 'pointer' } : undefined}
      >
        {text.length > 200 ? text.slice(0, 200) + '...' : text}
      </div>
    )
  }, [item.contentType, imageLoading, imageData, category, text])

  const categoryIcon = useMemo((): React.ReactElement => {
    if (item.contentType === 'image') {
      return (
        <span className="clip-item__type-icon" title="图片">
          <ImageIcon />
        </span>
      )
    }

    switch (category) {
      case 'link':
        return (
          <span
            className="clip-item__type-icon clip-item__type-icon--link"
            title="链接 - 点击打开"
            onClick={(e) => {
              e.stopPropagation()
              window.clipboardAPI.openUrl(text)
            }}
          >
            <LinkIcon />
          </span>
        )
      case 'code':
        return (
          <span className="clip-item__type-icon" title="代码">
            <CodeIcon />
          </span>
        )
      case 'email':
        return (
          <span className="clip-item__type-icon" title="邮箱">
            <EmailIcon />
          </span>
        )
      case 'color':
        return (
          <span className="clip-item__type-icon" title="颜色">
            <ColorIcon />
          </span>
        )
      default:
        return (
          <span className="clip-item__type-icon" title="文本">
            <TextIcon />
          </span>
        )
    }
  }, [item.contentType, category, text])

  return (
    <>
      <div
        ref={elRef}
        className={`clip-item ${isFocused ? 'clip-item--focused' : ''} ${item.isPinned ? 'clip-item--pinned' : ''}`}
        onDoubleClick={() => onCopy(item.id)}
        onContextMenu={handleContextMenuLocal}
      >
        <div className="clip-item__content">{renderContent}</div>
        <div className="clip-item__meta">
          {categoryIcon}
          <span className="clip-item__time">{formatRelativeTime(item.createdAt)}</span>
          {item.sizeBytes !== undefined && item.sizeBytes > 0 && (
            <span className="clip-item__size">{formatBytes(item.sizeBytes)}</span>
          )}
          {item.shortcut && (
            <span className="clip-item__shortcut" title={`按下 ${item.shortcut} 快速粘贴此内容`}>
              {item.shortcut}
            </span>
          )}
          <div className="clip-item__actions">
            {item.contentType === 'text' && (
              <button
                className="clip-item__btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEditModal(true)
                }}
                title="编辑"
              >
                <EditIcon />
              </button>
            )}
            <button
              className={`clip-item__btn ${item.shortcut ? 'clip-item__btn--active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setShowShortcutModal(true)
              }}
              title={item.shortcut ? `快捷键: ${item.shortcut} (快速粘贴)` : '设置快速粘贴快捷键'}
            >
              <ShortcutIcon />
            </button>
            <button
              className={`clip-item__btn ${item.isPinned ? 'clip-item__btn--active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin(item.id)
              }}
              title={item.isPinned ? '取消置顶' : '置顶'}
            >
              <PinIcon fill={item.isPinned ? 'currentColor' : 'none'} />
            </button>
            <button
              className="clip-item__btn clip-item__btn--danger"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item.id)
              }}
              title="删除"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>

      <ShortcutModal
        isOpen={showShortcutModal}
        onClose={() => setShowShortcutModal(false)}
        onSave={handleSetShortcut}
        currentShortcut={item.shortcut}
        allItems={items}
        currentItemId={item.id}
      />

      <EditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={(content) => onEdit(item.id, content)}
        currentContent={item.textContent || ''}
      />
    </>
  )
})

function ClipboardList({
  items,
  onCopy,
  onDelete,
  onTogglePin,
  onCreateMemo,
  onItemUpdate
}: ClipboardListProps): React.ReactElement {
  const listRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [contextMenuState, setContextMenuState] = useState<{
    itemId: number | null
    x: number
    y: number
  }>({
    itemId: null,
    x: 0,
    y: 0
  })
  // 分页加载状态
  const [displayCount, setDisplayCount] = useState(10)
  const ITEMS_PER_PAGE = 10
  const visibleItems = items.slice(0, displayCount)

  const handleEdit = async (id: number, content: string): Promise<void> => {
    await window.clipboardAPI.updateItemContent(id, content)
    onItemUpdate?.()
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (contextMenuState.itemId !== null) {
        const target = e.target as HTMLElement
        if (!target.closest('.clip-item__context-menu')) {
          setContextMenuState({ itemId: null, x: 0, y: 0 })
        }
      }
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setFocusedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenuState.itemId])

  // 滚动加载更多
  useEffect(() => {
    const list = listRef.current
    if (!list) return

    let ticking = false
    const handleScroll = (): void => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = list.scrollTop
          const scrollHeight = list.scrollHeight
          const clientHeight = list.clientHeight

          // 当滚动到底部附近时加载更多
          if (scrollTop + clientHeight >= scrollHeight - 200) {
            setDisplayCount((prev) => Math.min(prev + ITEMS_PER_PAGE, items.length))
          }
          ticking = false
        })
        ticking = true
      }
    }

    list.addEventListener('scroll', handleScroll, { passive: true })
    return () => list.removeEventListener('scroll', handleScroll)
  }, [items.length])

  // 当 items 变化时重置显示数量
  useEffect(() => {
    setDisplayCount(Math.min(ITEMS_PER_PAGE, items.length))
  }, [items.length])

  useEffect(() => {
    if (visibleItems.length === 0 && focusedIndex !== -1) {
      setFocusedIndex(-1)
      return
    }

    if (focusedIndex >= visibleItems.length && visibleItems.length > 0) {
      setFocusedIndex(visibleItems.length - 1)
    }
  }, [focusedIndex, visibleItems.length])

  const handleContextMenu = (e: React.MouseEvent, itemId: number): void => {
    setContextMenuState({ itemId, x: e.clientX, y: e.clientY })
  }

  const handleCloseContextMenu = (): void => {
    setContextMenuState({ itemId: null, x: 0, y: 0 })
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!listRef.current?.contains(document.activeElement)) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, visibleItems.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && visibleItems[focusedIndex]) {
            onCopy(visibleItems[focusedIndex].id)
          }
          break
        case 'Delete':
        case 'Backspace':
          if (focusedIndex >= 0 && visibleItems[focusedIndex]) {
            e.preventDefault()
            onDelete(visibleItems[focusedIndex].id)
            setFocusedIndex((prev) => Math.max(prev - 1, 0))
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedIndex, onCopy, onDelete, visibleItems])

  // 只渲染前 displayCount 个项目
  const displayItems = items.slice(0, displayCount)

  return (
    <div className="clipboard-list" ref={listRef} tabIndex={0}>
      {displayItems.map((item, index) => (
        <ClipboardItemCard
          key={item.id}
          item={item}
          items={items}
          onCopy={onCopy}
          onTogglePin={onTogglePin}
          onDelete={onDelete}
          onEdit={handleEdit}
          isFocused={index === focusedIndex}
          onContextMenu={handleContextMenu}
        />
      ))}
      {displayCount < items.length && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
          向下滚动加载更多...
        </div>
      )}
      {contextMenuState.itemId !== null &&
        (() => {
          const currentItem = items.find((item) => item.id === contextMenuState.itemId)
          if (!currentItem) return null

          const handleCreateMemo = (): void => {
            onCreateMemo(currentItem.textContent || '')
            handleCloseContextMenu()
          }

          return (
            <div
              className="clip-item__context-menu"
              style={{
                left: contextMenuState.x,
                top: contextMenuState.y,
                position: 'fixed',
                zIndex: 9999
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {currentItem.contentType === 'text' && currentItem.textContent && (
                <>
                  <div className="clip-item__context-menu-item" onClick={handleCreateMemo}>
                    <ShortcutIcon />
                    <span>设为备忘录</span>
                  </div>
                  <div className="clip-item__context-menu-separator" />
                </>
              )}
              <div
                className="clip-item__context-menu-item"
                onClick={() => {
                  onCopy(currentItem.id)
                  handleCloseContextMenu()
                }}
              >
                <CopyIcon />
                <span>复制</span>
              </div>
              <div
                className="clip-item__context-menu-item clip-item__context-menu-item--danger"
                onClick={() => {
                  onDelete(currentItem.id)
                  handleCloseContextMenu()
                }}
              >
                <TrashIcon />
                <span>删除</span>
              </div>
            </div>
          )
        })()}
    </div>
  )
}

export default ClipboardList
