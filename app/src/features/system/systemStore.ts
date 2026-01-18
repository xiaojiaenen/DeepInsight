export type SystemInfo = {
  os: {
    platform: string
    release: string
    version: string
    architecture: string
    hostname: string
    board: {
      manufacturer: string
      product: string
      version: string
      serial: string
    }
  }
  cpu: {
    brand: string
    cores_physical: number
    cores_logical: number
    freq_mhz: number
  }
  memory: {
    total_gb: number
    slots: Array<{
      capacity_gb: number
      speed: string
      manufacturer: string
      part_number: string
      slot: string
      type: string
    }>
  }
  network: {
    ip: string
  }
  gpus: Array<{
    index: number
    name: string
    utilization_gpu: number
    memory_used_mb: number
    memory_total_mb: number
    temperature_c: number
  }>
  python_envs: Array<{
    type: 'conda' | 'uv' | 'system' | 'venv'
    path: string
    name: string
  }>
}

type Listener = (info: SystemInfo | null) => void

let currentInfo: SystemInfo | null = null
const listeners = new Set<Listener>()

export function setSystemInfo(info: SystemInfo) {
  currentInfo = info
  for (const l of listeners) l(currentInfo)
}

export function getSystemInfo() {
  return currentInfo
}

export function subscribeSystemInfo(listener: Listener) {
  listeners.add(listener)
  listener(currentInfo)
  return () => {
    listeners.delete(listener)
  }
}
