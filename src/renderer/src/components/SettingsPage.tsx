import { useState, useEffect, useCallback } from 'react'
import type { Theme } from '../../../shared/types'

interface SettingsPageProps {
  onToast?: (message: string) => void
}

function SettingsPage({ onToast }: SettingsPageProps): React.ReactElement {
  const [theme, setTheme] = useState<Theme>('dark')
  const [autoLaunch, setAutoLaunch] = useState(false)
  const [historyLimit, setHistoryLimit] = useState(500)
  const [globalShortcut, setGlobalShortcut] = useState('Alt+Shift+V')
  const [isRecordingGlobal, setIsRecordingGlobal] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [memoryUsage, setMemoryUsage] = useState<{
    database: string
    images: string
    cache: string
    logs: string
    settings: string
    total: string
    appMemory: string
  } | null>(null)

  const loadSettings = useCallback(async (): Promise<void> => {
    const savedTheme = await window.clipboardAPI.getTheme()
    setTheme(savedTheme)
    const savedAutoLaunch = await window.clipboardAPI.getAutoLaunch()
    setAutoLaunch(savedAutoLaunch)
    const savedLimit = await window.clipboardAPI.getHistoryLimit()
    setHistoryLimit(savedLimit)
    const shortcut = await window.clipboardAPI.getShortcut()
    if (shortcut) setGlobalShortcut(shortcut)
    const memory = await window.clipboardAPI.getMemoryUsage()
    if (memory) {
      setMemoryUsage({
        database: memory.database,
        images: memory.images,
        cache: memory.cache,
        logs: memory.logs,
        settings: memory.settings,
        total: memory.total,
        appMemory: memory.appMemory
      })
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleThemeChange = async (newTheme: Theme): Promise<void> => {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    await window.clipboardAPI.setTheme(newTheme)
    onToast?.(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}主题`)
  }

  const handleAutoLaunchChange = async (enabled: boolean): Promise<void> => {
    try {
      await window.clipboardAPI.setAutoLaunch(enabled)
      setAutoLaunch(enabled)
      onToast?.(enabled ? '已开启开机自启动' : '已关闭开机自启动')
    } catch {
      onToast?.('设置失败')
    }
  }

  const handleHistoryLimitChange = async (value: number): Promise<void> => {
    const clamped = Math.max(100, Math.min(5000, value))
    setHistoryLimit(clamped)
    await window.clipboardAPI.setHistoryLimit(clamped)
    onToast?.(`历史记录上限已设为 ${clamped} 条`)
  }

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
        setStatus('快捷键设置成功！')
        onToast?.('全局快捷键设置成功！')
        setTimeout(() => setStatus(null), 2000)
      } else {
        setStatus('快捷键设置失败，请尝试其他组合')
      }
    } catch {
      setStatus('设置失败')
    }
  }

  const handleExportData = async (): Promise<void> => {
    try {
      const result = await window.clipboardAPI.exportData()
      if (result) {
        onToast?.('数据导出成功！')
      }
    } catch {
      onToast?.('导出失败')
    }
  }

  const handleImportData = async (): Promise<void> => {
    try {
      const result = await window.clipboardAPI.importData()
      if (result.success) {
        onToast?.(result.message)
      } else {
        onToast?.(result.message)
      }
    } catch {
      onToast?.('导入失败')
    }
  }

  const handleClearCache = async (): Promise<void> => {
    try {
      const success = await window.clipboardAPI.clearCache()
      if (success) {
        onToast?.('缓存已清理')
        const memory = await window.clipboardAPI.getMemoryUsage()
        if (memory) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { raw: _raw, ...display } = memory
          setMemoryUsage(display)
        }
      } else {
        onToast?.('清理失败')
      }
    } catch {
      onToast?.('清理失败')
    }
  }

  const handleRefreshMemory = async (): Promise<void> => {
    const memory = await window.clipboardAPI.getMemoryUsage()
    if (memory) {
      const display = {
        database: memory.database,
        images: memory.images,
        cache: memory.cache,
        logs: memory.logs,
        settings: memory.settings,
        total: memory.total,
        appMemory: memory.appMemory
      }
      setMemoryUsage(display)
      onToast?.('内存统计已刷新')
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-page__section">
        <h3 className="settings-page__section-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          外观
        </h3>
        <div className="settings-page__item">
          <div className="settings-page__item-info">
            <span className="settings-page__item-label">主题模式</span>
            <span className="settings-page__item-desc">选择应用的显示主题</span>
          </div>
          <div className="settings-page__theme-switch">
            <button
              className={`settings-page__theme-btn ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              浅色
            </button>
            <button
              className={`settings-page__theme-btn ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              深色
            </button>
          </div>
        </div>
      </div>

      <div className="settings-page__section">
        <h3 className="settings-page__section-title">
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
          快捷键
        </h3>
        <div className="settings-page__item">
          <div className="settings-page__item-info">
            <span className="settings-page__item-label">全局快捷键</span>
            <span className="settings-page__item-desc">按下快捷键显示/隐藏窗口</span>
          </div>
          <div className="settings-page__input-row">
            <input
              type="text"
              className={`settings-page__input ${isRecordingGlobal ? 'recording' : ''}`}
              value={isRecordingGlobal ? '请按下快捷键...' : globalShortcut}
              readOnly
              onClick={() => setIsRecordingGlobal(true)}
            />
            <button
              className="settings-page__btn settings-page__btn--secondary"
              onClick={() => setIsRecordingGlobal(!isRecordingGlobal)}
            >
              {isRecordingGlobal ? '取消' : '录制'}
            </button>
            <button
              className="settings-page__btn settings-page__btn--primary"
              onClick={handleSaveGlobalShortcut}
              disabled={isRecordingGlobal}
            >
              保存
            </button>
          </div>
        </div>
        {status && <div className="settings-page__status">{status}</div>}
      </div>

      <div className="settings-page__section">
        <h3 className="settings-page__section-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
          </svg>
          系统
        </h3>
        <div className="settings-page__item">
          <div className="settings-page__item-info">
            <span className="settings-page__item-label">开机自启动</span>
            <span className="settings-page__item-desc">系统启动时自动运行 ClipMaster</span>
          </div>
          <label className="settings-page__toggle">
            <input
              type="checkbox"
              checked={autoLaunch}
              onChange={(e) => handleAutoLaunchChange(e.target.checked)}
            />
            <span className="settings-page__toggle-slider"></span>
          </label>
        </div>
        <div className="settings-page__item">
          <div className="settings-page__item-info">
            <span className="settings-page__item-label">历史记录上限</span>
            <span className="settings-page__item-desc">最多保留的剪贴板记录数量（100-5000）</span>
          </div>
          <input
            type="number"
            className="settings-page__input"
            style={{ width: 80, textAlign: 'center' }}
            min={100}
            max={5000}
            step={100}
            value={historyLimit}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              if (!isNaN(val)) setHistoryLimit(val)
            }}
            onBlur={() => handleHistoryLimitChange(historyLimit)}
          />
        </div>
      </div>

      <div className="settings-page__section">
        <h3 className="settings-page__section-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          数据管理
        </h3>
        <div className="settings-page__item">
          <div className="settings-page__item-info">
            <span className="settings-page__item-label">数据备份</span>
            <span className="settings-page__item-desc">导出剪贴板历史、备忘录和设置</span>
          </div>
          <button
            className="settings-page__btn settings-page__btn--primary"
            onClick={handleExportData}
          >
            导出数据
          </button>
        </div>
        <div className="settings-page__item">
          <div className="settings-page__item-info">
            <span className="settings-page__item-label">数据恢复</span>
            <span className="settings-page__item-desc">从备份文件恢复数据</span>
          </div>
          <button
            className="settings-page__btn settings-page__btn--secondary"
            onClick={handleImportData}
          >
            导入数据
          </button>
        </div>
      </div>

      <div className="settings-page__section">
        <h3 className="settings-page__section-title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <path d="M2 7h20M7 2v20M12 12h.01M17 12h.01M12 17h.01M17 17h.01" />
          </svg>
          内存占用
        </h3>
        {memoryUsage && (
          <div className="settings-page__memory-stats">
            <div className="settings-page__memory-item">
              <span className="settings-page__memory-label">数据库</span>
              <span className="settings-page__memory-value">{memoryUsage.database}</span>
            </div>
            <div className="settings-page__memory-item">
              <span className="settings-page__memory-label">图片</span>
              <span className="settings-page__memory-value">{memoryUsage.images}</span>
            </div>
            <div className="settings-page__memory-item">
              <span className="settings-page__memory-label">缓存</span>
              <span className="settings-page__memory-value">{memoryUsage.cache}</span>
            </div>
            <div className="settings-page__memory-item">
              <span className="settings-page__memory-label">设置</span>
              <span className="settings-page__memory-value">{memoryUsage.settings}</span>
            </div>
            <div className="settings-page__memory-item settings-page__memory-item--total">
              <span className="settings-page__memory-label">磁盘占用总计</span>
              <span className="settings-page__memory-value">{memoryUsage.total}</span>
            </div>
            <div className="settings-page__memory-item settings-page__memory-item--app">
              <span className="settings-page__memory-label">运行时内存</span>
              <span className="settings-page__memory-value">{memoryUsage.appMemory}</span>
            </div>
          </div>
        )}
        <div className="settings-page__item">
          <div className="settings-page__item-info">
            <span className="settings-page__item-label">清理缓存</span>
            <span className="settings-page__item-desc">清理应用缓存以释放磁盘空间</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="settings-page__btn settings-page__btn--secondary"
              onClick={handleRefreshMemory}
            >
              刷新统计
            </button>
            <button
              className="settings-page__btn settings-page__btn--danger"
              onClick={handleClearCache}
            >
              清理缓存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
