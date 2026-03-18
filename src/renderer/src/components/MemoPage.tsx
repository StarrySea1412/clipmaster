import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { MemoItem } from '../../../shared/types'

interface QuickTimeOption {
  label: string
  minutes: number
}

const QUICK_TIME_OPTIONS: QuickTimeOption[] = [
  { label: '10分', minutes: 10 },
  { label: '30分', minutes: 30 },
  { label: '1小时', minutes: 60 },
  { label: '2小时', minutes: 120 },
  { label: '明天', minutes: 24 * 60 },
  { label: '后天', minutes: 48 * 60 }
]

function getQuickTimeLabel(minutes: number): string {
  const now = new Date()
  const remindTime = new Date(now.getTime() + minutes * 60 * 1000)
  const hours = remindTime.getHours().toString().padStart(2, '0')
  const mins = remindTime.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${mins}`

  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const remindDate = new Date(remindTime.getFullYear(), remindTime.getMonth(), remindTime.getDate())
  const dayDiff = Math.floor((remindDate.getTime() - nowDate.getTime()) / (24 * 60 * 60 * 1000))

  if (dayDiff === 1 || dayDiff === 2) {
    return `${remindTime.getMonth() + 1}月${remindTime.getDate()}日 ${timeStr}`
  }
  return timeStr
}

interface TimePickerProps {
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
}

function TimePicker({ hour, minute, onChange }: TimePickerProps): React.ReactElement {
  const hourRef = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hourRef.current) {
      const selectedHour = hourRef.current.querySelector('.time-picker__cell--selected')
      if (selectedHour) {
        selectedHour.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
  }, [hour])

  useEffect(() => {
    if (minuteRef.current) {
      const selectedMinute = minuteRef.current.querySelector('.time-picker__cell--selected')
      if (selectedMinute) {
        selectedMinute.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
  }, [minute])

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), [])
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), [])

  return (
    <div className="time-picker">
      <div className="time-picker__columns">
        <div className="time-picker__column">
          <div className="time-picker__header">时</div>
          <div className="time-picker__list" ref={hourRef}>
            {hours.map((h) => (
              <div
                key={h}
                className={`time-picker__cell ${hour === h ? 'time-picker__cell--selected' : ''}`}
                onClick={() => onChange(h, minute)}
              >
                {h.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
        <div className="time-picker__column">
          <div className="time-picker__header">分</div>
          <div className="time-picker__list" ref={minuteRef}>
            {minutes.map((m) => (
              <div
                key={m}
                className={`time-picker__cell ${minute === m ? 'time-picker__cell--selected' : ''}`}
                onClick={() => onChange(hour, m)}
              >
                {m.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SelectOption {
  value: string | number
  label: string
}

interface CustomSelectProps {
  options: SelectOption[]
  value: string | number | null
  onChange: (value: string | number) => void
  placeholder?: string
}

function CustomSelect({
  options,
  value,
  onChange,
  placeholder = '请选择'
}: CustomSelectProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string | number): void => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`custom-select ${isOpen ? 'custom-select--open' : ''}`} ref={selectRef}>
      <div className="custom-select__trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className={selectedOption ? '' : 'custom-select__placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`custom-select__arrow ${isOpen ? 'custom-select__arrow--up' : ''}`}
          width={10}
          height={10}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {isOpen && (
        <div className="custom-select__dropdown">
          <div className="custom-select__options">
            {options.map((option) => (
              <div
                key={option.value}
                className={`custom-select__option ${value === option.value ? 'custom-select__option--selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface TimeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (minutes: number | null, date: Date | null, hour: number, minute: number) => void
  selectedMinutes: number | null
  selectedDate: Date | null
  selectedHour: number
  selectedMinute: number
}

function TimeModal({
  isOpen,
  onClose,
  onConfirm,
  selectedMinutes,
  selectedDate,
  selectedHour,
  selectedMinute
}: TimeModalProps): React.ReactElement | null {
  const [mode, setMode] = useState<'quick' | 'custom'>('quick')
  const [localMinutes, setLocalMinutes] = useState<number | null>(selectedMinutes)
  const [localDate, setLocalDate] = useState<Date | null>(selectedDate)
  const [localHour, setLocalHour] = useState(selectedHour)
  const [localMinute, setLocalMinute] = useState(selectedMinute)

  const modalRef = useRef<HTMLDivElement>(null)

  const dateOptions = useMemo((): SelectOption[] => {
    const options: SelectOption[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      let label: string
      if (i === 0) {
        label = '今天'
      } else if (i === 1) {
        label = '明天'
      } else {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        label = weekdays[date.getDay()]
      }

      options.push({
        value: date.toDateString(),
        label: `${label} ${date.getMonth() + 1}/${date.getDate()}`
      })
    }
    return options
  }, [])

  useEffect(() => {
    if (isOpen) {
      setLocalMinutes(selectedMinutes)
      setLocalDate(selectedDate)
      setLocalHour(selectedHour)
      setLocalMinute(selectedMinute)
      setMode(selectedDate ? 'custom' : 'quick')
    }
  }, [isOpen, selectedMinutes, selectedDate, selectedHour, selectedMinute])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [isOpen, onClose])

  const handleQuickSelect = (minutes: number): void => {
    setLocalMinutes(minutes)
    setLocalDate(null)
  }

  const handleConfirm = (): void => {
    onConfirm(localMinutes, localDate, localHour, localMinute)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent): void => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="time-modal__overlay" onClick={handleOverlayClick}>
      <div className="time-modal" ref={modalRef}>
        <div className="time-modal__header">
          <span className="time-modal__title">设置提醒时间</span>
          <button className="time-modal__close" onClick={onClose}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="time-modal__tabs">
          <button
            className={`time-modal__tab ${mode === 'quick' ? 'time-modal__tab--active' : ''}`}
            onClick={() => setMode('quick')}
          >
            快捷选择
          </button>
          <button
            className={`time-modal__tab ${mode === 'custom' ? 'time-modal__tab--active' : ''}`}
            onClick={() => setMode('custom')}
          >
            自定义
          </button>
        </div>

        <div className="time-modal__content">
          {mode === 'quick' ? (
            <div className="time-modal__quick">
              <div className="time-modal__quick-grid">
                {QUICK_TIME_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    className={`time-modal__quick-btn ${
                      localMinutes === option.minutes ? 'time-modal__quick-btn--active' : ''
                    }`}
                    onClick={() => handleQuickSelect(option.minutes)}
                  >
                    <span className="time-modal__quick-label">{option.label}</span>
                    <span className="time-modal__quick-time">
                      {getQuickTimeLabel(option.minutes)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="time-modal__custom">
              <div className="time-modal__row">
                <div className="time-modal__field">
                  <label className="time-modal__label">日期</label>
                  <CustomSelect
                    options={dateOptions}
                    value={localDate ? localDate.toDateString() : null}
                    onChange={(val) => {
                      setLocalDate(new Date(val as string))
                      setLocalMinutes(null)
                    }}
                    placeholder="选择日期"
                  />
                </div>
              </div>
              <div className="time-modal__field">
                <label className="time-modal__label">时间</label>
                <TimePicker
                  hour={localHour}
                  minute={localMinute}
                  onChange={(h, m) => {
                    setLocalHour(h)
                    setLocalMinute(m)
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="time-modal__footer">
          <button className="time-modal__btn time-modal__btn--secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="time-modal__btn time-modal__btn--primary"
            onClick={handleConfirm}
            disabled={mode === 'quick' ? localMinutes === null : localDate === null}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

interface MemoPageProps {
  initialContent?: string
  onCreated?: () => void
}

function MemoPage({ initialContent, onCreated }: MemoPageProps): React.ReactElement {
  const [memos, setMemos] = useState<MemoItem[]>([])
  const [showCreateForm, setShowCreateForm] = useState(() => !!initialContent)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState(() => initialContent || '')
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState(12)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [timeError, setTimeError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const titleInputRef = useRef<HTMLInputElement>(null)

  const loadMemos = useCallback(async (): Promise<void> => {
    const data = await window.clipboardAPI.getMemos()
    setMemos(data)
  }, [])

  useEffect(() => {
    loadMemos()
    const timer = setInterval(loadMemos, 60000)
    return () => clearInterval(timer)
  }, [loadMemos])

  useEffect(() => {
    const timeTimer = setInterval(() => setCurrentTime(Date.now()), 60000)
    return () => clearInterval(timeTimer)
  }, [])

  useEffect(() => {
    if (initialContent) {
      setContent(initialContent)
      setShowCreateForm(true)
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [initialContent])

  const handleCreateMemo = async (): Promise<void> => {
    if (!title.trim()) return

    let remindAt: number
    if (selectedDate) {
      const date = new Date(selectedDate)
      date.setHours(selectedHour, selectedMinute, 0, 0)
      remindAt = date.getTime()
    } else if (selectedMinutes !== null) {
      remindAt = Date.now() + selectedMinutes * 60 * 1000
    } else {
      return
    }

    if (remindAt <= Date.now()) {
      setTimeError('提醒时间必须大于当前时间')
      return
    }
    setTimeError(null)

    await window.clipboardAPI.createMemo(title.trim(), content.trim(), remindAt)
    setTitle('')
    setContent('')
    setSelectedMinutes(null)
    setSelectedDate(null)
    setShowCreateForm(false)
    await loadMemos()
    onCreated?.()
  }

  const handleDeleteMemo = async (id: number): Promise<void> => {
    await window.clipboardAPI.deleteMemo(id)
    await loadMemos()
  }

  const handleCompleteMemo = async (id: number): Promise<void> => {
    await window.clipboardAPI.completeMemo(id)
    await loadMemos()
  }

  const handleTimeConfirm = (
    minutes: number | null,
    date: Date | null,
    hour: number,
    minute: number
  ): void => {
    setSelectedMinutes(minutes)
    setSelectedDate(date)
    setSelectedHour(hour)
    setSelectedMinute(minute)
  }

  const formatRemindTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow =
      new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === date.toDateString()

    if (isToday) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
    } else if (isTomorrow) {
      return `明天 ${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
    }
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeUntil = useCallback(
    (timestamp: number): string => {
      const diff = timestamp - currentTime
      if (diff <= 0) return '已到期'
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      if (hours > 24) {
        const days = Math.floor(hours / 24)
        return `${days}天后`
      }
      if (hours > 0) return `${hours}小时后`
      return `${minutes}分钟后`
    },
    [currentTime]
  )

  const getDisplayTime = (): string => {
    if (selectedDate) {
      return `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日 ${selectedHour
        .toString()
        .padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`
    }
    if (selectedMinutes !== null) {
      const option = QUICK_TIME_OPTIONS.find((o) => o.minutes === selectedMinutes)
      const timeStr = getQuickTimeLabel(selectedMinutes)
      return `${option?.label}（${timeStr}）`
    }
    return ''
  }

  return (
    <div className="memo-page">
      <div className="memo-page__header">
        <h2 className="memo-page__title">备忘录</h2>
        <span className="memo-page__count">{memos.length} 条备忘</span>
      </div>

      <button className="memo-page__add-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>新建备忘</span>
      </button>

      {showCreateForm && (
        <div className="memo-page__create-form">
          <input
            ref={titleInputRef}
            type="text"
            placeholder="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="memo-page__input"
          />
          <textarea
            placeholder="内容（可选）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="memo-page__textarea"
            rows={3}
          />

          <button
            className={`memo-page__time-btn ${
              selectedMinutes !== null || selectedDate ? 'memo-page__time-btn--set' : ''
            }`}
            onClick={() => setShowTimeModal(true)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              {selectedMinutes !== null || selectedDate ? getDisplayTime() : '设置提醒时间'}
            </span>
          </button>

          {timeError && (
            <p
              style={{ color: 'var(--color-error, #e06c75)', fontSize: '12px', margin: '4px 0 0' }}
            >
              {timeError}
            </p>
          )}

          <div className="memo-page__form-actions">
            <button onClick={() => setShowCreateForm(false)} className="memo-page__btn">
              取消
            </button>
            <button
              onClick={handleCreateMemo}
              className="memo-page__btn memo-page__btn--primary"
              disabled={!title.trim() || (selectedMinutes === null && !selectedDate)}
            >
              创建
            </button>
          </div>
        </div>
      )}

      <div className="memo-page__list">
        {memos.length === 0 ? (
          <div className="memo-page__empty">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 6v12a3 3 0 1 0 3 3H9a3 3 0 1 1-3-3V6" />
              <path d="M9 3h6v3H9z" />
              <path d="M12 12v4" />
            </svg>
            <span className="memo-page__empty-text">暂无备忘录</span>
            <span className="memo-page__empty-hint">点击上方按钮创建</span>
          </div>
        ) : (
          memos.map((memo) => (
            <div key={memo.id} className="memo-page__item">
              <div className="memo-page__item-header">
                <div className="memo-page__item-left">
                  <button
                    className={`memo-page__checkbox ${memo.isCompleted ? 'memo-page__checkbox--checked' : ''}`}
                    onClick={() => handleCompleteMemo(memo.id)}
                    title={memo.isCompleted ? '标记为未完成' : '标记为已完成'}
                  >
                    {memo.isCompleted && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`memo-page__item-title ${memo.isCompleted ? 'memo-page__item-title--completed' : ''}`}
                  >
                    {memo.title}
                  </span>
                </div>
                <button
                  className="memo-page__item-delete"
                  onClick={() => handleDeleteMemo(memo.id)}
                  title="删除"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {memo.content && <div className="memo-page__item-content">{memo.content}</div>}
              <div className="memo-page__item-time">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {formatRemindTime(memo.remindAt)} ({getTimeUntil(memo.remindAt)})
              </div>
            </div>
          ))
        )}
      </div>

      <TimeModal
        isOpen={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        onConfirm={handleTimeConfirm}
        selectedMinutes={selectedMinutes}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        selectedMinute={selectedMinute}
      />
    </div>
  )
}

export default MemoPage
