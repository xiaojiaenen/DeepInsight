export type OomAnalysis = {
  run_id?: string | null
  message: string
  likely_location?: string | null
  suggestions: string[]
  ts_ms: number
}

type Listener = (oom: OomAnalysis | null) => void

let current: OomAnalysis | null = null
const listeners = new Set<Listener>()

export function setOomAnalysis(oom: OomAnalysis) {
  current = oom
  for (const l of listeners) l(current)
}

export function clearOomAnalysis() {
  current = null
  for (const l of listeners) l(current)
}

export function getOomAnalysis() {
  return current
}

export function subscribeOom(listener: Listener) {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}

