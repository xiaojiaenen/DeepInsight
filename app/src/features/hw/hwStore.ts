export type HwGpu = {
  index: number
  name: string
  utilization_gpu: number
  memory_used_mb: number
  memory_total_mb: number
  temperature_c: number
}

export type HwSnapshot = {
  ts_ms: number
  gpus: HwGpu[]
  error?: string | null
}

type Listener = (snap: HwSnapshot | null) => void

let current: HwSnapshot | null = null
const listeners = new Set<Listener>()

export function setHwSnapshot(snap: HwSnapshot) {
  current = snap
  for (const l of listeners) l(current)
}

export function getHwSnapshot() {
  return current
}

export function subscribeHw(listener: Listener) {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}

