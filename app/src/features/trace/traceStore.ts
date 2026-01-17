export type TraceLocation = {
  path: string
  lineNumber: number
  ts_ms: number
}

type Listener = (loc: TraceLocation | null) => void

let current: TraceLocation | null = null
const listeners = new Set<Listener>()

export function setTraceLocation(loc: TraceLocation) {
  current = loc
  for (const l of listeners) l(current)
}

export function clearTraceLocation() {
  current = null
  for (const l of listeners) l(current)
}

export function subscribeTraceLocation(listener: Listener) {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}

