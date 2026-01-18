export type HwGpu = {
  index: number
  name: string
  utilization_gpu: number
  memory_used_mb: number
  memory_total_mb: number
  temperature_c: number
}

export type HwCpu = {
  utilization: number
  temp_c?: number
}

export type HwSnapshot = {
  ts_ms: number
  gpus: HwGpu[]
  cpu?: HwCpu
  error?: string | null
}

type Listener = (snap: HwSnapshot | null) => void

let current: HwSnapshot | null = null
let history: HwSnapshot[] = []
const MAX_HISTORY = 60 // 1分钟的数据 (假设1s一次)
const listeners = new Set<Listener>()
const historyListeners = new Set<(history: HwSnapshot[]) => void>()

export function setHwSnapshot(snap: HwSnapshot) {
  current = snap
  history = [...history, snap].slice(-MAX_HISTORY)
  for (const l of listeners) l(current)
  for (const l of historyListeners) l(history)
}

export function getHwSnapshot() {
  return current
}

export function getHwHistory() {
  return history
}

export function subscribeHw(listener: Listener) {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}

export function subscribeHwHistory(listener: (history: HwSnapshot[]) => void) {
  historyListeners.add(listener)
  listener(history)
  return () => {
    historyListeners.delete(listener)
  }
}

