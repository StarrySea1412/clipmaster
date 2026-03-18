import type { ContentCategory } from './types'

const URL_RE = /^https?:\/\/\S+$/m
const URL_LOOSE_RE = /https?:\/\/\S{4,}/
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/m
const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/
const RGB_COLOR_RE = /rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}/
const HSL_COLOR_RE = /hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?/

const CODE_KEYWORDS =
  /\b(function|const|let|var|return|import|export|class|interface|if|else|for|while|switch|case|def|fn|pub|async|await|struct|enum|impl|type|package|public|private|static|void|int|string|bool|float|double|null|nil|None|True|False|true|false|undefined|println|fmt|print|console)\b/
const CODE_PATTERNS = /[{}[\]();].*[{}[\]();]/m
const CODE_ARROW = /=>/
const CODE_ASSIGN = /[a-zA-Z_]\w*\s*[:=]\s*[^=]/m
const CODE_INDENT = /^[ \t]{2,}\S/m
const CODE_COMMENT = /^\s*(\/\/|#|\/\*|\*|<!--)/m

const categoryCache = new Map<string, ContentCategory>()
const MAX_CACHE_SIZE = 500

export function classifyContent(text: string): ContentCategory {
  const trimmed = text.trim()
  if (!trimmed) return 'text'

  const cacheKey = trimmed.length < 200 ? trimmed : trimmed.slice(0, 200)
  const cached = categoryCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  let result: ContentCategory = 'text'

  if (HEX_COLOR_RE.test(trimmed) || RGB_COLOR_RE.test(trimmed) || HSL_COLOR_RE.test(trimmed)) {
    const isShort = trimmed.length < 30
    const isJustColor = /^(#|rgba?|hsla?)\(?[\s\d,.%#a-fA-F]+\)?$/.test(trimmed)
    if (isJustColor || isShort) result = 'color'
  }

  if (result === 'text' && EMAIL_RE.test(trimmed) && trimmed.split('\n').length <= 3) {
    result = 'email'
  }

  if (result === 'text') {
    const lines = trimmed.split('\n')
    if (lines.length <= 2 && URL_RE.test(lines[0].trim())) {
      result = 'link'
    } else if (URL_LOOSE_RE.test(trimmed) && lines.length === 1) {
      result = 'link'
    }
  }

  if (result === 'text') {
    const lines = trimmed.split('\n')
    let codeScore = 0
    if (CODE_KEYWORDS.test(trimmed)) codeScore += 2
    if (CODE_PATTERNS.test(trimmed)) codeScore += 2
    if (CODE_ARROW.test(trimmed)) codeScore++
    if (CODE_ASSIGN.test(trimmed)) codeScore++
    if (CODE_INDENT.test(trimmed)) codeScore++
    if (CODE_COMMENT.test(trimmed)) codeScore += 2
    if (lines.length >= 3 && codeScore >= 2) result = 'code'
    else if (codeScore >= 3) result = 'code'
  }

  if (categoryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = categoryCache.keys().next().value
    if (firstKey !== undefined) {
      categoryCache.delete(firstKey)
    }
  }
  categoryCache.set(cacheKey, result)

  return result
}

const COLOR_ALL_RE =
  /#(?:[0-9a-fA-F]{3,4}){1,2}\b|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}[^)]*\)|hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?[^)]*\)/g

export function extractColors(text: string): string[] {
  return text.match(COLOR_ALL_RE) || []
}

export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/\S+/)
  return match ? match[0] : null
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
