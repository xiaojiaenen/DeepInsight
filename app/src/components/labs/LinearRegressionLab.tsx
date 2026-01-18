import React, { useEffect, useMemo, useState } from 'react'
import { editorInsertText } from '../../lib/editorBus'
import { subscribeRuns } from '../../features/runs/runsStore'
import type { RunRecord } from '../../features/runs/runTypes'
import { Play, CheckCircle2, Circle, Lightbulb, Code2 } from 'lucide-react'
import { motion } from 'framer-motion'

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

const labCode = `# 练习：用梯度下降拟合一元线性回归，并记录 loss 指标
# 目标：
# 1) 训练过程中输出 __METRIC__ : {"name":"loss","value":<float>,"step":<int>}
# 2) 让 loss 明显下降，并最终 < 0.02
#
# 提示：你需要补全 TODO 部分的梯度计算逻辑

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
        # 使用标准的 __METRIC__ 格式进行数据追踪
        print(f'__METRIC__ : {{"name":"loss","value":{loss},"step":{step}}}')

    # TODO: 实现梯度下降更新 (dw, db)
    # dw = np.mean(err * x) * 2
    # db = np.mean(err) * 2
    # w -= lr * dw
    # b -= lr * db

print(f"训练完成: w={float(w):.4f}, b={float(b):.4f}")
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
      { id: 'metric', title: '输出 Loss 指标 (__METRIC__)', done: s1, detail: s1 ? '已成功捕获训练指标' : '请运行代码并确保输出符合格式要求' },
      { id: 'improve', title: '实现梯度下降 (Loss 下降 >30%)', done: s2, detail: s2 ? '梯度更新逻辑有效' : '请在 TODO 处补全权重更新公式' },
      { id: 'target', title: '模型收敛 (Loss < 0.02)', done: s3, detail: s3 ? '模型精度达标' : '如果未达标，请检查学习率或迭代次数' },
    ]
  }, [run])

  const doneCount = steps.filter((s) => s.done).length

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Code2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">实验室：线性回归与指标追踪</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                完成进度: {doneCount}/{steps.length}
              </span>
            </div>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          onClick={() => editorInsertText({ text: `\n${labCode}\n`, ensureNewline: true, mode: 'end' })}
        >
          <Play className="w-3 h-3 fill-current" />
          插入练习代码
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        <div className="grid gap-3">
          {steps.map((s, idx) => (
            <motion.div 
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`
                group relative overflow-hidden rounded-xl border p-4 transition-all
                ${s.done 
                  ? 'border-emerald-500/30 bg-emerald-500/5' 
                  : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <div className={`mt-0.5 ${s.done ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {s.done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${s.done ? 'text-emerald-100' : 'text-slate-300'}`}>
                      {s.title}
                    </h4>
                    {s.detail && (
                      <p className={`mt-1 text-xs ${s.done ? 'text-emerald-400/70' : 'text-slate-500'}`}>
                        {s.detail}
                      </p>
                    )}
                  </div>
                </div>
                {s.done && (
                  <span className="text-[10px] font-black uppercase text-emerald-500/40 tracking-widest">Completed</span>
                )}
              </div>
              {/* 装饰性背景线 */}
              <div className={`absolute bottom-0 right-0 w-24 h-24 -mr-8 -mb-8 opacity-5 rounded-full ${s.done ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </motion.div>
          ))}
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 flex gap-3">
          <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">专家提示</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              切换到 <span className="text-emerald-400 font-bold">"运行 (Runs)"</span> 标签页可实时观察 Loss 曲线。如果指标未刷新，请确保输出格式完全符合：
              <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-emerald-400 font-mono">__METRIC__ : {"{...}"}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

