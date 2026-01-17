import type { LessonDefinition } from './lessonTypes'
import { coerceVisualAction } from '../visualization/coerceVisualAction'

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

export function loadLessonFromJson(payload: unknown): LessonDefinition | null {
  if (!isObject(payload)) return null
  const id = payload.id
  const title = payload.title
  const durationMs = payload.durationMs
  const events = payload.events

  if (typeof id !== 'string' || typeof title !== 'string') return null
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) return null
  if (!Array.isArray(events)) return null

  const parsed = events
    .map((e): { atMs: number; action: LessonDefinition['events'][number]['action'] } | null => {
      if (!isObject(e)) return null
      const atMs = e.atMs
      const action = e.action
      if (typeof atMs !== 'number' || !Number.isFinite(atMs) || atMs < 0) return null
      const a = coerceVisualAction(action)
      if (!a) return null
      return { atMs, action: a }
    })
    .filter((x): x is { atMs: number; action: LessonDefinition['events'][number]['action'] } => x !== null)
    .sort((a, b) => a.atMs - b.atMs)

  return {
    id,
    title,
    durationMs,
    events: parsed,
  }
}

export async function fetchLesson(url: string): Promise<LessonDefinition> {
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Failed to load lesson: ${res.status}`)
  const json = (await res.json()) as unknown
  const lesson = loadLessonFromJson(json)
  if (!lesson) throw new Error('Invalid lesson format')
  return lesson
}
