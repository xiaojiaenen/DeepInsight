import { useEffect, useRef, useState } from 'react'
import { KernelClient, type KernelMessage, type KernelProjectFile } from '../../lib/kernelClient'
import { terminalClear, terminalWrite, terminalWriteLine } from '../../lib/terminalBus'
import { addMetric, finishRun, startRun } from '../runs/runsStore'
import { setHwSnapshot } from '../hw/hwStore'
import { setSystemInfo } from '../system/systemStore'
import { setOomAnalysis } from '../oom/oomStore'
import { clearTraceLocation, setTraceLocation } from '../trace/traceStore'
import { getWorkspaceState } from '../workspace/workspaceStore'

export type KernelStatus = 'connecting' | 'open' | 'closed' | 'error'

type UseKernelResult = {
  pythonBadge: string
  isRunning: boolean
  status: KernelStatus
  run: (code: string) => void
  runProject: (files: KernelProjectFile[], entry: string) => void
  runWorkspace: (workspaceRoot: string, entry: string) => void
  stop: () => void
  requestSystemInfo: () => void
}

const DEFAULT_TIMEOUT_S = 30

export function useKernel(): UseKernelResult {
  const [pythonBadge, setPythonBadge] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState<KernelStatus>('closed')
  const clientRef = useRef<KernelClient | null>(null)
  const runIdRef = useRef<string | null>(null)
  const lastCodeRef = useRef<string | undefined>(undefined)

  const requestSystemInfo = () => {
    clientRef.current?.requestSystemInfo()
  }

  useEffect(() => {
    const normalizeForTerminal = (s: string) => s.replace(/\r?\n/g, '\r\n')

    const client = new KernelClient({
      onStatus: (s) => {
        setStatus(s)
        if (s === 'connecting') terminalWriteLine('正在连接 Kernel...')
        if (s === 'open') terminalWriteLine('Kernel 已连接。')
        if (s === 'closed') terminalWriteLine('Kernel 连接已断开。')
        if (s === 'error') terminalWriteLine('Kernel 连接发生错误。')
      },
      onMessage: (msg: KernelMessage) => {
        if (msg.type === 'hello') {
          const full = (msg.python ?? '').trim()
          const version = full.split(' ')[0] ?? ''
          if (version) setPythonBadge(version)
          terminalWriteLine(`Python: ${full}`)
          if (msg.executable) terminalWriteLine(`解释器: ${msg.executable}`)
          return
        }
        if (msg.type === 'start') {
          runIdRef.current = msg.run_id
          setIsRunning(true)
          startRun(msg.run_id, lastCodeRef.current)
          terminalWriteLine('开始运行...')
          return
        }
        if (msg.type === 'stdout') {
          if (runIdRef.current && msg.run_id !== runIdRef.current) return
          terminalWrite(normalizeForTerminal(msg.data))
          return
        }
        if (msg.type === 'stderr') {
          if (runIdRef.current && msg.run_id !== runIdRef.current) return
          const m = msg.data.match(/File "([^"]+)", line (\d+)/)
          if (m) {
            const path = m[1] ?? ''
            const lineStr = m[2] ?? '1'
            const lineNumber = Number(lineStr)
            if (path && Number.isFinite(lineNumber)) setTraceLocation({ path, lineNumber, ts_ms: Date.now() })
          }
          terminalWrite(normalizeForTerminal(msg.data))
          return
        }
        if (msg.type === 'metric') {
          if (runIdRef.current && msg.run_id !== runIdRef.current) return
          addMetric(msg.run_id, { name: msg.name, value: msg.value, step: msg.step })
          return
        }
        if (msg.type === 'hw') {
          setHwSnapshot({ ts_ms: msg.ts_ms, gpus: msg.gpus, cpu: msg.cpu, error: msg.error })
          return
        }
        if (msg.type === 'system_info') {
          setSystemInfo(msg.data)
          return
        }
        if (msg.type === 'oom') {
          const suggestions = msg.suggestions ?? []
          setOomAnalysis({
            run_id: msg.run_id ?? null,
            message: msg.message,
            likely_location: msg.likely_location ?? null,
            suggestions,
            ts_ms: Date.now(),
          })
          terminalWriteLine('显存分析器：检测到 OOM（Out of Memory）。')
          terminalWriteLine(`原因：${msg.message}`)
          if (msg.likely_location) terminalWriteLine(`可能位置：${msg.likely_location}`)
          if (suggestions.length) {
            terminalWriteLine('建议：')
            for (const s of suggestions.slice(0, 6)) terminalWriteLine(`- ${s}`)
          }
          return
        }
        if (msg.type === 'done') {
          if (runIdRef.current && msg.run_id !== runIdRef.current) return
          setIsRunning(false)
          finishRun(msg.run_id, { exitCode: msg.exit_code, timedOut: msg.timed_out, cancelled: msg.cancelled })
          runIdRef.current = null
          if (msg.timed_out) terminalWriteLine('运行超时。')
          if (msg.cancelled) terminalWriteLine('已停止。')
          terminalWriteLine(`进程退出码: ${msg.exit_code}`)
          terminalWriteLine('运行结束。')
          return
        }
        if (msg.type === 'error') {
          setIsRunning(false)
          terminalWriteLine(`错误: ${msg.message}`)
        }
      },
    })

    client.connect()
    clientRef.current = client

    return () => {
      clientRef.current = null
    }
  }, [])

  const run = (code: string) => {
    terminalClear()
    clearTraceLocation()
    terminalWriteLine('DeepInsight 运行器')
    terminalWriteLine('--------------------------------')
    lastCodeRef.current = code
    clientRef.current?.exec(code, DEFAULT_TIMEOUT_S)
  }

  const runProject = (files: KernelProjectFile[], entry: string) => {
    terminalClear()
    clearTraceLocation()
    terminalWriteLine('DeepInsight 运行器')
    terminalWriteLine('--------------------------------')
    const entryFile = files.find((f) => f.path === entry)
    lastCodeRef.current = entryFile?.content
    clientRef.current?.execProject(files, entry, DEFAULT_TIMEOUT_S)
  }

  const runWorkspace = (workspaceRoot: string, entry: string) => {
    terminalClear()
    clearTraceLocation()
    terminalWriteLine('DeepInsight 运行器')
    terminalWriteLine('--------------------------------')
    lastCodeRef.current = undefined
    const { customPythonPath } = getWorkspaceState()
    clientRef.current?.execWorkspace(workspaceRoot, entry, DEFAULT_TIMEOUT_S, customPythonPath)
  }

  const stop = () => {
    const runId = runIdRef.current
    if (!runId) return
    clientRef.current?.cancel(runId)
  }

  return {
    pythonBadge,
    isRunning,
    status,
    run,
    runProject,
    runWorkspace,
    stop,
    requestSystemInfo,
  }
}
