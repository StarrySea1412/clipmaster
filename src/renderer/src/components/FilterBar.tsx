import { memo } from 'react'
import type { ContentCategory } from '../types'

interface FilterOption {
  value: ContentCategory | null
  label: string
}

const FILTERS: FilterOption[] = [
  { value: null, label: '全部' },
  { value: 'text', label: '文本' },
  { value: 'code', label: '代码' },
  { value: 'link', label: '链接' },
  { value: 'image', label: '图片' },
  { value: 'color', label: '颜色' }
]

interface FilterBarProps {
  active: ContentCategory | null
  onChange: (category: ContentCategory | null) => void
}

const FilterBar = memo(function FilterBar({
  active,
  onChange
}: FilterBarProps): React.ReactElement {
  return (
    <div className="filter-bar">
      {FILTERS.map((f) => (
        <button
          key={f.value ?? 'all'}
          className={`filter-bar__btn ${active === f.value ? 'filter-bar__btn--active' : ''}`}
          onClick={() => onChange(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
})

export default FilterBar
