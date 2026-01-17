import React, { useEffect, useMemo, useState } from 'react'
import { publishVisualAction } from '../../features/visualization/visualBus'
import { subscribeVisualState } from '../../features/visualization/visualStore'
import type { VisualState } from '../../features/visualization/visualTypes'
import { editorInsertText } from '../../lib/editorBus'
import { copyToClipboard } from '../../lib/copyToClipboard'

type M2 = VisualState['matrix2x2']

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const round2 = (n: number) => Math.round(n * 100) / 100

const withMatrix = (m: M2) => publishVisualAction({ kind: 'tween', to: { mode: 'matrix', matrix2x2: m }, durationMs: 180 })

export const MatrixControls: React.FC = () => {
  const [mode, setMode] = useState<VisualState['mode']>('cube')
  const [m, setM] = useState<M2>([
    [1, 0],
    [0, 1],
  ])

  useEffect(() => {
    return subscribeVisualState((s) => {
      setMode(s.mode)
      setM(s.matrix2x2)
    })
  }, [])

  const a = m[0][0]
  const b = m[0][1]
  const c = m[1][0]
  const d = m[1][1]

  const canShow = useMemo(() => mode === 'matrix', [mode])
  const snippet = useMemo(
    () => `print('__VIS__ : {"mode":"matrix","matrix2x2":[[${a},${b}],[${c},${d}]]}')\n`,
    [a, b, c, d],
  )

  const setEntry = (r: 0 | 1, cIndex: 0 | 1, v: number) => {
    const next: M2 = [
      [m[0][0], m[0][1]],
      [m[1][0], m[1][1]],
    ]
    next[r][cIndex] = round2(clamp(v, -2, 2))
    setM(next)
    withMatrix(next)
  }

  if (!canShow) {
    return (
      <div className="absolute left-3 bottom-16 bg-white/90 backdrop-blur border border-slate-200 rounded-xl px-3 py-2">
        <button
          className="text-xs bg-slate-900 text-white hover:bg-slate-800 px-2 py-1 rounded"
          onClick={() => withMatrix(m)}
        >
          进入矩阵模式
        </button>
      </div>
    )
  }

  return (
    <div className="absolute left-3 bottom-16 w-[260px] bg-white/90 backdrop-blur border border-slate-200 rounded-xl px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-700">矩阵 2×2</div>
        <button
          className="text-xs text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 bg-white"
          onClick={() => publishVisualAction({ kind: 'tween', to: { mode: 'cube' }, durationMs: 220 })}
        >
          返回立方体
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 tabular-nums">
        <div className="flex items-center justify-between">
          <span>a</span>
          <span>{a.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>b</span>
          <span>{b.toFixed(2)}</span>
        </div>
        <input
          className="col-span-1"
          type="range"
          min={-2}
          max={2}
          step={0.05}
          value={a}
          onChange={(e) => setEntry(0, 0, Number(e.target.value))}
        />
        <input
          className="col-span-1"
          type="range"
          min={-2}
          max={2}
          step={0.05}
          value={b}
          onChange={(e) => setEntry(0, 1, Number(e.target.value))}
        />

        <div className="flex items-center justify-between">
          <span>c</span>
          <span>{c.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>d</span>
          <span>{d.toFixed(2)}</span>
        </div>
        <input
          className="col-span-1"
          type="range"
          min={-2}
          max={2}
          step={0.05}
          value={c}
          onChange={(e) => setEntry(1, 0, Number(e.target.value))}
        />
        <input
          className="col-span-1"
          type="range"
          min={-2}
          max={2}
          step={0.05}
          value={d}
          onChange={(e) => setEntry(1, 1, Number(e.target.value))}
        />
      </div>

      <div className="mt-2 flex gap-2">
        <button
          className="text-xs text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 bg-white"
          onClick={() => withMatrix([[1, 0], [0, 1]])}
        >
          单位
        </button>
        <button
          className="text-xs text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 bg-white"
          onClick={() => withMatrix([[1, 1], [0, 1]])}
        >
          剪切
        </button>
        <button
          className="text-xs text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 bg-white"
          onClick={() => withMatrix([[0, -1], [1, 0]])}
        >
          旋转90°
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          className="text-xs bg-slate-900 text-white hover:bg-slate-800 px-2 py-1 rounded"
          onClick={() => editorInsertText({ text: snippet, ensureNewline: true })}
        >
          插入 __VIS__
        </button>
        <button
          className="text-xs text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 bg-white"
          onClick={() => void copyToClipboard(snippet)}
        >
          复制
        </button>
      </div>
    </div>
  )
}
