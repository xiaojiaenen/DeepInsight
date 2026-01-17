import type { VisualState } from './visualTypes'

const PREFIX = '__VIS__'

export function parseVisualMessage(line: string): Partial<VisualState> | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith(PREFIX)) return null

  const raw = trimmed.slice(PREFIX.length).trim().replace(/^:/, '').trim()
  if (!raw) return null

  try {
    const obj = JSON.parse(raw) as unknown
    if (obj && typeof obj === 'object') return obj as Partial<VisualState>
    return null
  } catch {
    return null
  }
}

