import React, { useEffect, useMemo, useState } from 'react'
import { editorInsertText } from '../../lib/editorBus'
import { subscribeRuns } from '../../features/runs/runsStore'
import type { RunRecord } from '../../features/runs/runTypes'

type LabStep = {
  id: string
  title: string
  done: boolean
  detail?: string
}

const latestRun = (runs: RunRecord[]) => runs[0] ?? null

const metricSeries = (run: RunRecord | null, name: string) => {
  if (!run) return []
  return run.metrics.filter((m) => m.name === name).sort((a, b) => a.step - b.step)
}

const hasMetric = (run: RunRecord | null, name: string) => metricSeries(run, name).length > 0

const lossImproves = (run: RunRecord | null) => {
  const pts = metricSeries(run, 'loss')
  if (pts.length < 5) return false
  const first = pts[0]?.value
  const last = pts[pts.length - 1]?.value
  if (typeof first !== 'number' || typeof last !== 'number') return false
  return last < first * 0.7
}

const lossLowEnough = (run: RunRecord | null) => {
  const pts = metricSeries(run, 'loss')
  if (pts.length < 5) return false
  const last = pts[pts.length - 1]?.value
  if (typeof last !== 'number') return false
  return last < 0.02
}

const labCode = `# 练习：用梯度下降拟合一元线性回归，并记录 loss 指标（MLOps 风格）
# 目标：
# 1) 训练过程中输出 __METRIC__ : {"name":"loss","value":<float>,"step":<int>}
# 2) loss 能明显下降，并最终 < 0.02
#
# 提示：你可以只改 TODO 部分

import numpy as np

rng = np.random.default_rng(0)
n = 256
x = rng.uniform(-1, 1, size=(n, 1))
true_w = 2.0
true_b = -0.4
y = true_w * x + true_b + rng.normal(0, 0.05, size=(n, 1))

w = 0.0
b = 0.0
lr = 0.2
steps = 120

for step in range(steps + 1):
    y_pred = w * x + b
    err = y_pred - y
    loss = float(np.mean(err ** 2))

    if step % 10 == 0:
        print(f'__METRIC__ : {"name":"loss","value":{loss},"step":{step}}')

    # TODO: 实现梯度下降更新（dw, db）
    # dw = ...
    # db = ...
    # w -= lr * dw
    # b -= lr * db

print("final", "w=", float(w), "b=", float(b))
`

export const LinearRegressionLab: React.FC = () => {
  const [runs, setRuns] = useState<RunRecord[]>([])

  useEffect(() => {
    return subscribeRuns((r) => setRuns(r))
  }, [])

  const run = useMemo(() => latestRun(runs), [runs])
  const steps: LabStep[] = useMemo(() => {
    const s1 = hasMetric(run, 'loss')
    const s2 = lossImproves(run)
    const s3 = lossLowEnough(run)
    return [
      { id: 'metric', title: '输出 loss 指标（__METRIC__）', done: s1, detail: s1 ? '已检测到 loss 指标' : '运行代码并输出 loss' },
      { id: 'improve', title: '让 loss 下降（至少 30%）', done: s2, detail: s2 ? 'loss 已明显下降' : '实现梯度下降更新' },
      { id: 'target', title: '达到目标 loss < 0.02', done: s3, detail: s3 ? '达标' : '调参/修正梯度公式' },
    ]
  }, [run])

  const doneCount = steps.filter((s) => s.done).length

  return (
    <div className="h-full w-full bg-white">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-900">Lab：线性回归 + 指标追踪</div>
          <div className="text-xs text-slate-500">完成度：{doneCount}/{steps.length}（基于最近一次 Run 的指标）</div>
        </div>
        <button
          className="text-xs bg-slate-900 text-white hover:bg-slate-800 px-2 py-1 rounded"
          onClick={() => editorInsertText({ text: `\n${labCode}\n`, ensureNewline: true, mode: 'end' })}
        >
          插入练习代码
        </button>
      </div>

      <div className="p-4 space-y-3">
        {steps.map((s) => (
          <div key={s.id} className={`rounded border px-3 py-2 ${s.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-900">{s.title}</div>
              <div className={`text-xs ${s.done ? 'text-emerald-700' : 'text-slate-500'}`}>{s.done ? '已完成' : '未完成'}</div>
            </div>
            {s.detail ? <div className="mt-1 text-xs text-slate-600">{s.detail}</div> : null}
          </div>
        ))}

        <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs text-slate-600">
            提示：切到 Runs 标签页可以查看 loss 曲线（按 step 记录）。如果你没有看到指标，检查输出格式是否完全匹配：__METRIC__ : &lt;JSON&gt;
          </div>
        </div>
      </div>
    </div>
  )
}

