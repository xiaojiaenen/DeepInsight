import { useEffect, useRef, useState } from 'react'
import { KernelClient, type KernelMessage } from '../../lib/kernelClient'
import { terminalClear, terminalWrite, terminalWriteLine } from '../../lib/terminalBus'
import { addMetric, finishRun, startRun } from '../runs/runsStore'

type UseKernelResult = {
  pythonBadge: string
  isRunning: boolean
  run: (code: string) => void
  stop: () => void
}

const DEFAULT_TIMEOUT_S = 30

export function useKernel(): UseKernelResult {
  const [pythonBadge, setPythonBadge] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const clientRef = useRef<KernelClient | null>(null)
  const runIdRef = useRef<string | null>(null)
  const lastCodeRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const normalizeForTerminal = (s: string) => s.replace(/\r?\n/g, '\r\n')

    const client = new KernelClient({
      onStatus: (s) => {
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
          terminalWrite(normalizeForTerminal(msg.data))
          return
        }
        if (msg.type === 'metric') {
          if (runIdRef.current && msg.run_id !== runIdRef.current) return
          addMetric(msg.run_id, { name: msg.name, value: msg.value, step: msg.step })
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
    terminalWriteLine('DeepInsight 运行器')
    terminalWriteLine('--------------------------------')
    lastCodeRef.current = code
    clientRef.current?.exec(code, DEFAULT_TIMEOUT_S)
  }

  const stop = () => {
    const runId = runIdRef.current
    if (!runId) return
    clientRef.current?.cancel(runId)
  }

  return { pythonBadge, isRunning, run, stop }
}
