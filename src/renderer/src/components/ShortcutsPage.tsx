import { useState, useEffect, useCallback } from 'react'
import type { ClipboardItem } from '../../../shared/types'

interface ShortcutsPageProps {
  onToast?: (message: string) => void
}

function ShortcutsPage({ onToast }: ShortcutsPageProps): React.ReactElement {
  const [globalShortcut, setGlobalShortcut] = useState('Alt+Shift+V')
  const [isRecordingGlobal, setIsRecordingGlobal] = useState(false)
  const [itemsWithShortcuts, setItemsWithShortcuts] = useState<ClipboardItem[]>([])
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editingShortcut, setEditingShortcut] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const loadData = useCallback(async (): Promise<void> => {
    const shortcut = await window.clipboardAPI.getShortcut()
    if (shortcut) setGlobalShortcut(shortcut)
    const items = await window.clipboardAPI.getItemsWithShortcuts()
    setItemsWithShortcuts(items)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isRecordingGlobal) return

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
        setGlobalShortcut(newShortcut)
        setIsRecordingGlobal(false)
      }
    },
    [isRecordingGlobal]
  )

  useEffect(() => {
    if (isRecordingGlobal) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
    return undefined
  }, [isRecordingGlobal, handleKeyDown])

  const handleSaveGlobalShortcut = async (): Promise<void> => {
    try {
      const success = await window.clipboardAPI.setShortcut(globalShortcut)
      if (success) {
        setStatus('全局快捷键设置成功！')
        onToast?.('全局快捷键设置成功！')
        setTimeout(() => setStatus(null), 2000)
      } else {
        setStatus('快捷键设置失败，请尝试其他组合')
      }
    } catch {
      setStatus('设置失败')
    }
  }

  const handleEditShortcut = (item: ClipboardItem): void => {
    setEditingItemId(item.id)
    setEditingShortcut(item.shortcut || '')
  }

  const handleSaveItemShortcut = async (itemId: number): Promise<void> => {
    try {
      const trimmedShortcut = editingShortcut.trim()
      if (trimmedShortcut) {
        const result = await window.clipboardAPI.setItemShortcut(itemId, trimmedShortcut)
        if (result) {
          setItemsWithShortcuts((prev) =>
            prev.map((item) => (item.id === itemId ? { ...item, shortcut: trimmedShortcut } : item))
          )
          onToast?.('快捷键设置成功！')
        } else {
          onToast?.('快捷键设置失败')
        }
      }
    } catch {
      onToast?.('设置失败')
    }
    setEditingItemId(null)
    setEditingShortcut('')
  }

  const handleRemoveShortcut = async (itemId: number): Promise<void> => {
    try {
      await window.clipboardAPI.setItemShortcut(itemId, null)
      setItemsWithShortcuts((prev) => prev.filter((item) => item.id !== itemId))
      onToast?.('快捷键已删除')
    } catch {
      onToast?.('删除失败')
    }
  }

  const handleCancelEdit = (): void => {
    setEditingItemId(null)
    setEditingShortcut('')
  }

  const truncateText = (text: string | null, maxLength: number = 50): string => {
    if (!text) return ''
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
  }

  return (
    <div className="shortcuts-page">
      <div className="shortcuts-page__section">
        <h3 className="shortcuts-page__section-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 16h.01M18 16h.01" />
          </svg>
          全局快捷键
        </h3>
        <p className="shortcuts-page__hint">按下此快捷键可以显示/隐藏应用窗口</p>
        <div className="shortcuts-page__input-row">
          <input
            type="text"
            className={`shortcuts-page__input ${isRecordingGlobal ? 'recording' : ''}`}
            value={isRecordingGlobal ? '请按下快捷键...' : globalShortcut}
            readOnly
            onClick={() => setIsRecordingGlobal(true)}
          />
          <button
            className="shortcuts-page__btn shortcuts-page__btn--secondary"
            onClick={() => setIsRecordingGlobal(!isRecordingGlobal)}
          >
            {isRecordingGlobal ? '取消' : '录制'}
          </button>
          <button
            className="shortcuts-page__btn shortcuts-page__btn--primary"
            onClick={handleSaveGlobalShortcut}
            disabled={isRecordingGlobal}
          >
            保存
          </button>
        </div>
        {status && <div className="shortcuts-page__status">{status}</div>}
      </div>

      <div className="shortcuts-page__section">
        <h3 className="shortcuts-page__section-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          快捷粘贴
        </h3>
        <p className="shortcuts-page__hint">为剪贴板项目设置快捷键，按下后自动粘贴内容</p>

        {itemsWithShortcuts.length === 0 ? (
          <div className="shortcuts-page__empty">
            <p>暂无快捷粘贴项目</p>
            <p className="shortcuts-page__empty-hint">在剪贴板列表中右键项目可设置快捷键</p>
          </div>
        ) : (
          <div className="shortcuts-page__list">
            {itemsWithShortcuts.map((item) => (
              <div key={item.id} className="shortcuts-page__item">
                <div className="shortcuts-page__item-content">
                  {item.contentType === 'image' ? (
                    <div className="shortcuts-page__item-preview shortcuts-page__item-preview--image">
                      <img src={item.imageData} alt="图片" />
                    </div>
                  ) : (
                    <span className="shortcuts-page__item-text">
                      {truncateText(item.textContent)}
                    </span>
                  )}
                </div>
                {editingItemId === item.id ? (
                  <div className="shortcuts-page__item-edit">
                    <input
                      type="text"
                      className="shortcuts-page__input shortcuts-page__input--small"
                      value={editingShortcut}
                      onChange={(e) => setEditingShortcut(e.target.value)}
                      placeholder="如: Ctrl+Shift+1"
                      autoFocus
                    />
                    <button
                      className="shortcuts-page__btn shortcuts-page__btn--small shortcuts-page__btn--primary"
                      onClick={() => handleSaveItemShortcut(item.id)}
                    >
                      保存
                    </button>
                    <button
                      className="shortcuts-page__btn shortcuts-page__btn--small shortcuts-page__btn--secondary"
                      onClick={handleCancelEdit}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="shortcuts-page__item-actions">
                    <span className="shortcuts-page__item-shortcut">{item.shortcut}</span>
                    <button
                      className="shortcuts-page__btn shortcuts-page__btn--small shortcuts-page__btn--secondary"
                      onClick={() => handleEditShortcut(item)}
                    >
                      编辑
                    </button>
                    <button
                      className="shortcuts-page__btn shortcuts-page__btn--small shortcuts-page__btn--danger"
                      onClick={() => handleRemoveShortcut(item.id)}
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ShortcutsPage
