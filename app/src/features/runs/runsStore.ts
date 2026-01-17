import type { RunMetricPoint, RunRecord } from './runTypes'

type RunsListener = (runs: RunRecord[]) => void

const STORAGE_KEY = 'deepinsight:runs:v1'
const MAX_RUNS = 30

const listeners = new Set<RunsListener>()
let runs: RunRecord[] = []

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return
    runs = parsed as RunRecord[]
  } catch (e) {
    void e
  }
}

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs))
  } catch (e) {
    void e
  }
}

const notify = () => {
  for (const l of listeners) l(runs)
}

load()

export function subscribeRuns(listener: RunsListener) {
  listeners.add(listener)
  listener(runs)
  return () => {
    listeners.delete(listener)
  }
}

export function getRuns(): RunRecord[] {
  return runs
}

export function clearRuns() {
  runs = []
  persist()
  notify()
}

export function startRun(runId: string, code?: string) {
  const now = Date.now()
  const r: RunRecord = { runId, startedAt: now, code, metrics: [] }
  runs = [r, ...runs].slice(0, MAX_RUNS)
  persist()
  notify()
}

export function finishRun(runId: string, payload: { exitCode: number | null; timedOut: boolean; cancelled: boolean }) {
  const now = Date.now()
  runs = runs.map((r) => {
    if (r.runId !== runId) return r
    return { ...r, finishedAt: now, exitCode: payload.exitCode, timedOut: payload.timedOut, cancelled: payload.cancelled }
  })
  persist()
  notify()
}

export function addMetric(runId: string, point: Omit<RunMetricPoint, 'ts'>) {
  const ts = Date.now()
  runs = runs.map((r) => {
    if (r.runId !== runId) return r
    const next = { ...r, metrics: [...r.metrics, { ...point, ts }] }
    return next
  })
  persist()
  notify()
}
