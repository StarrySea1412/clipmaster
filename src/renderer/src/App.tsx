import { useState, useEffect, useCallback, useRef, lazy, Suspense, Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import SearchBar from './components/SearchBar'
import FilterBar from './components/FilterBar'
import ClipboardList from './components/ClipboardList'
import WeatherWidget from './components/WeatherWidget'
import { useClipboard } from './hooks/useClipboard'

const MemoPage = lazy(() => import('./components/MemoPage'))
const ShortcutsPage = lazy(() => import('./components/ShortcutsPage'))
const SettingsPage = lazy(() => import('./components/SettingsPage'))

class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ClipMaster] Component error:', error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="loading-fallback">
            <p>加载失败</p>
            <button
              className="settings-btn settings-btn--secondary"
              onClick={() => this.setState({ hasError: false })}
            >
              重试
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}

interface MenuPosition {
  x: number
  y: number
}

function ContextMenu({
  position,
  onClose,
  onSettings,
  onClear
}: {
  position: MenuPosition
  onClose: () => void
  onSettings: () => void
  onClear: () => void
}): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    const timerId = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    document.addEventListener('keydown', handleEsc)
    return () => {
      clearTimeout(timerId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  const style: React.CSSProperties = {
    left: position.x,
    top: position.y
  }

  return (
    <div className="context-menu" ref={menuRef} style={style}>
      <div
        className="context-menu-item"
        onClick={() => {
          onSettings()
          onClose()
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>设置</span>
      </div>
      <div className="context-menu-separator" />
      <div
        className="context-menu-item"
        onClick={() => {
          onClear()
          onClose()
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
        <span>清空历史</span>
      </div>
    </div>
  )
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}): React.ReactElement {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div className="settings-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button className="settings-btn settings-btn--secondary" onClick={onCancel}>
            取消
          </button>
          <button className="settings-btn settings-btn--danger" onClick={onConfirm}>
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

function Toast({ message }: { message: string }): React.ReactElement {
  return <div className="toast">{message}</div>
}

type TabType = 'clipboard' | 'memo' | 'shortcuts' | 'settings'

function App(): React.ReactElement {
  const {
    items,
    searchValue,
    setSearchValue,
    activeCategory,
    setActiveCategory,
    copyToClipboard,
    togglePin,
    deleteItem,
    clearHistory,
    refresh,
    toastMessage
  } = useClipboard()
  const [activeTab, setActiveTab] = useState<TabType>('clipboard')
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [memoContent, setMemoContent] = useState<string | undefined>(undefined)

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setMenuPosition({ x: e.clientX, y: e.clientY })
  }, [])

  const handleClearHistory = useCallback(() => {
    setShowConfirm(true)
  }, [])

  const confirmClear = useCallback(() => {
    setShowConfirm(false)
    clearHistory()
  }, [clearHistory])

  const handleCreateMemoFromItem = useCallback((content: string) => {
    setMemoContent(content)
    setActiveTab('memo')
  }, [])

  const handleMemoCreated = useCallback(() => {
    setMemoContent(undefined)
  }, [])

  return (
    <div className="app" onContextMenu={handleContextMenu}>
      <WeatherWidget />

      <div className="app__tabs">
        <button
          className={`app__tab ${activeTab === 'clipboard' ? 'app__tab--active' : ''}`}
          onClick={() => setActiveTab('clipboard')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
          <span>剪贴板</span>
        </button>
        <button
          className={`app__tab ${activeTab === 'memo' ? 'app__tab--active' : ''}`}
          onClick={() => setActiveTab('memo')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>备忘录</span>
        </button>
        <button
          className={`app__tab ${activeTab === 'shortcuts' ? 'app__tab--active' : ''}`}
          onClick={() => setActiveTab('shortcuts')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h8M6 16h.01M18 16h.01" />
          </svg>
          <span>快捷键</span>
        </button>
        <button
          className={`app__tab ${activeTab === 'settings' ? 'app__tab--active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>设置</span>
        </button>
      </div>

      {activeTab === 'clipboard' ? (
        <>
          <header className="app__header">
            <h1 className="app__title">ClipMaster</h1>
            <span className="app__count">{items.length} 条记录</span>
          </header>
          <div className="app__search">
            <SearchBar value={searchValue} onChange={setSearchValue} />
            <FilterBar active={activeCategory} onChange={setActiveCategory} />
          </div>
          <main className="app__content">
            <ClipboardList
              items={items}
              onCopy={copyToClipboard}
              onTogglePin={togglePin}
              onDelete={deleteItem}
              onCreateMemo={handleCreateMemoFromItem}
              onItemUpdate={refresh}
            />
          </main>
        </>
      ) : activeTab === 'memo' ? (
        <main className="app__content">
          <ErrorBoundary>
            <Suspense fallback={<div className="loading-fallback">加载中...</div>}>
              <MemoPage initialContent={memoContent} onCreated={handleMemoCreated} />
            </Suspense>
          </ErrorBoundary>
        </main>
      ) : activeTab === 'shortcuts' ? (
        <main className="app__content">
          <ErrorBoundary>
            <Suspense fallback={<div className="loading-fallback">加载中...</div>}>
              <ShortcutsPage />
            </Suspense>
          </ErrorBoundary>
        </main>
      ) : (
        <main className="app__content">
          <ErrorBoundary>
            <Suspense fallback={<div className="loading-fallback">加载中...</div>}>
              <SettingsPage />
            </Suspense>
          </ErrorBoundary>
        </main>
      )}

      {menuPosition && (
        <ContextMenu
          position={menuPosition}
          onClose={() => setMenuPosition(null)}
          onSettings={() => setActiveTab('settings')}
          onClear={handleClearHistory}
        />
      )}
      {showConfirm && (
        <ConfirmDialog
          message="确定要清空所有历史记录吗？（置顶项目将保留）"
          onConfirm={confirmClear}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  )
}

export default App
