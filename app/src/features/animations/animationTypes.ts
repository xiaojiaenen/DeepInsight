export type AnimationEvent = {
  atMs: number
  title: string
  body: string
}

export type AnimationScript = {
  durationMs: number
  events: AnimationEvent[]
}

export type KnowledgePoint = {
  id: string
  title: string
  description?: string
  script: AnimationScript
}

