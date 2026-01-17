import type { VisualAction } from '../visualization/visualActions'

export type LessonEvent = {
  atMs: number
  action: VisualAction
}

export type LessonDefinition = {
  id: string
  title: string
  durationMs: number
  events: LessonEvent[]
}

