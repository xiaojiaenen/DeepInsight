export type RunMetricPoint = {
  name: string
  value: number
  step: number
  ts: number
}

export type RunRecord = {
  runId: string
  startedAt: number
  finishedAt?: number
  exitCode?: number | null
  timedOut?: boolean
  cancelled?: boolean
  code?: string
  metrics: RunMetricPoint[]
}

