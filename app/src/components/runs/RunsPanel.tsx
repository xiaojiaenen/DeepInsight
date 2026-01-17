import React, { useEffect, useMemo, useState } from 'react'
import { Clock, List, Trash2 } from 'lucide-react'
import { clearRuns, subscribeRuns } from '../../features/runs/runsStore'
import type { RunRecord } from '../../features/runs/runTypes'
import { copyToClipboard } from '../../lib/copyToClipboard'

const fmtTime = (ts: number) => {
  const d = new Date(ts)
  return d.toLocaleString()
}

const shortId = (id: string) => id.slice(0, 8)

const statusText = (r: RunRecord) => {
  if (!r.finishedAt) return '运行中'
  if (r.timedOut) return '超时'
  if (r.cancelled) return '已停止'
  if (r.exitCode === 0) return '成功'
  return `失败(${r.exitCode ?? 'null'})`
}

const msToHuman = (ms: number) => {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const latestMetrics = (r: RunRecord) => {
  const map = new Map<string, RunRecord['metrics'][number]>()
  for (const p of r.metrics) {
    const prev = map.get(p.name)
    if (!prev || p.step >= prev.step) map.set(p.name, p)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

type RunsPanelProps = {
  embedded?: boolean
}

export const RunsPanel: React.FC<RunsPanelProps> = ({ embedded }) => {
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    return subscribeRuns((r) => {
      setRuns(r)
      if (!selectedId && r.length > 0) setSelectedId(r[0]?.runId ?? null)
      if (selectedId && !r.some((x) => x.runId === selectedId)) setSelectedId(r[0]?.runId ?? null)
    })
  }, [selectedId])

  const selected = useMemo(() => runs.find((r) => r.runId === selectedId) ?? null, [runs, selectedId])

  const body = (
    <div className="flex-1 min-h-0 flex">
        <div className="w-[260px] border-r border-border overflow-auto">
          {runs.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">暂无运行记录</div>
          ) : (
            <div className="p-2 space-y-2">
              {runs.map((r) => {
                const active = r.runId === selectedId
                const dur = r.finishedAt ? r.finishedAt - r.startedAt : Date.now() - r.startedAt
                const lm = latestMetrics(r)
                return (
                  <button
                    key={r.runId}
                    className={`w-full text-left rounded border px-2 py-2 transition-colors ${
                      active ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedId(r.runId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-xs text-slate-700">{shortId(r.runId)}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {msToHuman(dur)}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{statusText(r)}</div>
                    {lm.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {lm.slice(0, 3).map((p) => (
                          <span
                            key={p.name}
                            className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 tabular-nums"
                          >
                            {p.name}={p.value.toFixed(4)}@{p.step}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 overflow-auto p-3">
          {!selected ? (
            <div className="text-sm text-muted-foreground">选择一个 Run 查看详情</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">Run {selected.runId}</div>
                  <div className="text-xs text-slate-500">开始：{fmtTime(selected.startedAt)}</div>
                  {selected.finishedAt ? (
                    <div className="text-xs text-slate-500">
                      结束：{fmtTime(selected.finishedAt)}（{msToHuman(selected.finishedAt - selected.startedAt)}）
                    </div>
                  ) : null}
                </div>
                {selected.code ? (
                  <button
                    className="text-xs text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 bg-white"
                    onClick={() => void copyToClipboard(selected.code ?? '')}
                  >
                    复制代码
                  </button>
                ) : null}
              </div>

              <div className="rounded border border-slate-200 bg-white">
                <div className="px-3 py-2 border-b border-slate-200 text-xs text-slate-600">指标</div>
                <div className="p-3">
                  {selected.metrics.length === 0 ? (
                    <div className="text-sm text-slate-500">
                      暂无指标。可在 Python 中输出：<span className="font-mono">__METRIC__ : &lt;JSON&gt;</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Array.from(
                        selected.metrics.reduce((m, p) => {
                          const arr = m.get(p.name) ?? []
                          arr.push(p)
                          m.set(p.name, arr)
                          return m
                        }, new Map<string, typeof selected.metrics>()),
                      )
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([name, pts]) => {
                          const last = pts[pts.length - 1]
                          return (
                            <div key={name} className="flex items-center justify-between gap-2">
                              <div className="text-sm text-slate-800">{name}</div>
                              <div className="text-xs text-slate-600 tabular-nums">
                                {last ? `${last.value.toFixed(6)} @ step ${last.step}` : '-'}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  )

  if (embedded) return body

  return (
    <div className="flex flex-col h-full w-full bg-background border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border h-10">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <List className="w-4 h-4" />
          <span>Runs</span>
        </div>
        <button
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title="清空"
          onClick={() => clearRuns()}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {body}
    </div>
  )
}
