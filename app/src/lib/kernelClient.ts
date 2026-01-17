export type KernelMessage =
  | { type: 'hello'; python?: string; executable?: string }
  | { type: 'start'; run_id: string }
  | { type: 'stdout'; data: string; run_id: string }
  | { type: 'stderr'; data: string; run_id: string }
  | { type: 'metric'; run_id: string; name: string; value: number; step: number }
  | {
      type: 'hw'
      ts_ms: number
      gpus: Array<{
        index: number
        name: string
        utilization_gpu: number
        memory_used_mb: number
        memory_total_mb: number
        temperature_c: number
      }>
      error?: string | null
    }
  | {
      type: 'oom'
      run_id?: string | null
      message: string
      likely_location?: string | null
      suggestions?: string[]
    }
  | { type: 'done'; run_id: string; exit_code: number | null; timed_out: boolean; cancelled: boolean }
  | { type: 'error'; message: string; run_id?: string | null }

type KernelClientOptions = {
  url?: string
  onMessage: (msg: KernelMessage) => void
  onStatus?: (status: 'connecting' | 'open' | 'closed' | 'error') => void
}

export type KernelProjectFile = { path: string; content: string }
export type KernelWorkspaceExec = { workspace_root: string; entry: string; timeout_s?: number }

export class KernelClient {
  private ws: WebSocket | null = null
  private url: string
  private onMessage: (msg: KernelMessage) => void
  private onStatus?: (status: 'connecting' | 'open' | 'closed' | 'error') => void
  private reconnectTimer: number | null = null

  constructor(options: KernelClientOptions) {
    this.url = options.url ?? 'ws://127.0.0.1:8000/ws'
    this.onMessage = options.onMessage
    this.onStatus = options.onStatus
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.onStatus?.('connecting')
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => this.onStatus?.('open')
    this.ws.onclose = () => {
      this.onStatus?.('closed')
      this.scheduleReconnect()
    }
    this.ws.onerror = () => {
      this.onStatus?.('error')
      this.scheduleReconnect()
    }
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as KernelMessage
        this.onMessage(msg)
      } catch {
        this.onMessage({ type: 'error', message: String(ev.data), run_id: null })
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 1000)
  }

  exec(code: string, timeout_s = 30) {
    this.send({ type: 'exec', code, timeout_s })
  }

  execProject(files: KernelProjectFile[], entry: string, timeout_s = 30) {
    this.send({ type: 'exec', files, entry, timeout_s })
  }

  execWorkspace(workspace_root: string, entry: string, timeout_s = 30) {
    this.send({ type: 'exec', workspace_root, entry, timeout_s })
  }

  cancel(run_id: string) {
    this.send({ type: 'cancel', run_id })
  }

  private send(payload: unknown) {
    this.connect()
    const ws = this.ws
    if (!ws) return

    const raw = JSON.stringify(payload)
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(raw)
      return
    }

    const onOpen = () => {
      ws.removeEventListener('open', onOpen)
      ws.send(raw)
    }
    ws.addEventListener('open', onOpen)
  }
}
