import React, { useEffect, useMemo, useState } from 'react'
import { editorInsertText } from '../../lib/editorBus'
import { subscribeRuns } from '../../features/runs/runsStore'
import type { RunRecord } from '../../features/runs/runTypes'
import { Brain, CheckCircle2, PlayCircle, Target, Lightbulb, Circle, Code2 } from 'lucide-react'
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

const accuracyReached = (run: RunRecord | null, target: number) => {
  const pts = metricSeries(run, 'accuracy')
  if (pts.length === 0) return false
  const last = pts[pts.length - 1]?.value
  if (typeof last !== 'number') return false
  return last >= target
}

const lossDecreased = (run: RunRecord | null) => {
  const pts = metricSeries(run, 'loss')
  if (pts.length < 10) return false
  const first = pts[0]?.value
  const last = pts[pts.length - 1]?.value
  if (typeof first !== 'number' || typeof last !== 'number') return false
  return last < first * 0.5
}

const labCode = `# 练习：实现一个简单的 2 层神经网络（MLP）进行二分类
# 目标：
# 1) 手写实现前向传播与反向传播（Backpropagation）
# 2) 记录 accuracy 和 loss 指标
# 3) Accuracy 最终达到 0.9 以上

import numpy as np

# 生成螺旋数据集 (非线性可分)
def generate_spiral_data(n_points=200):
    n_features = 2
    x = np.zeros((n_points * 2, n_features))
    y = np.zeros((n_points * 2, 1))
    for i in range(2):
        r = np.linspace(0, 1, n_points)
        t = np.linspace(i * 4, (i + 1) * 4, n_points) + np.random.randn(n_points) * 0.2
        x[i*n_points:(i+1)*n_points] = np.c_[r * np.sin(t), r * np.cos(t)]
        y[i*n_points:(i+1)*n_points] = i
    return x, y

x, y = generate_spiral_data()

# 初始化权重 (使用较小的随机值)
input_dim = 2
hidden_dim = 16
output_dim = 1

w1 = np.random.randn(input_dim, hidden_dim) * 0.01
b1 = np.zeros((1, hidden_dim))
w2 = np.random.randn(hidden_dim, output_dim) * 0.01
b2 = np.zeros((1, output_dim))

lr = 0.1
epochs = 1000

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

for epoch in range(epochs + 1):
    # TODO: 前向传播
    # z1 = x @ w1 + b1
    # a1 = np.tanh(z1) # 隐藏层激活函数
    # z2 = a1 @ w2 + b2
    # a2 = sigmoid(z2) # 输出层激活函数
    
    # 占位符: 实际实现时请替换
    a2 = np.random.random(y.shape) 
    
    loss = -np.mean(y * np.log(a2 + 1e-8) + (1 - y) * np.log(1 - a2 + 1e-8))
    acc = np.mean((a2 > 0.5) == y)

    if epoch % 100 == 0:
        # 记录关键训练指标
        print(f'__METRIC__ : {{"name":"loss","value":{loss},"step":{epoch}}}')
        print(f'__METRIC__ : {{"name":"accuracy","value":{acc},"step":{epoch}}}')

    # TODO: 反向传播 (计算梯度)
    # dz2 = a2 - y
    # dw2 = a1.T @ dz2 / len(x)
    # db2 = np.mean(dz2, axis=0)
    # da1 = dz2 @ w2.T
    # dz1 = da1 * (1 - a1**2) # tanh 的导数
    # dw1 = x.T @ dz1 / len(x)
    # db1 = np.mean(dz1, axis=0)

    # TODO: 参数更新
    # w1 -= lr * dw1
    # b1 -= lr * db1
    # w2 -= lr * dw2
    # b2 -= lr * db2

print("训练任务已完成！")
`

export const NNBackpropLab: React.FC = () => {
  const [runs, setRuns] = useState<RunRecord[]>([])

  useEffect(() => {
    return subscribeRuns((r) => setRuns(r))
  }, [])

  const run = useMemo(() => latestRun(runs), [runs])
  const steps: LabStep[] = useMemo(() => {
    const s1 = hasMetric(run, 'accuracy') && hasMetric(run, 'loss')
    const s2 = lossDecreased(run)
    const s3 = accuracyReached(run, 0.9)
    return [
      { 
        id: 'metrics', 
        title: '输出双重指标 (Loss & Accuracy)', 
        done: s1, 
        detail: s1 ? '已成功捕获训练指标流' : '请在训练循环中同时输出 loss 和 accuracy' 
      },
      { 
        id: 'training', 
        title: '手写反向传播算法', 
        done: s2, 
        detail: s2 ? '梯度传播逻辑有效，Loss 显著下降' : '请补全 dw1, dw2 等梯度的计算逻辑' 
      },
      { 
        id: 'accuracy', 
        title: '螺旋数据分类达标 (> 0.9)', 
        done: s3, 
        detail: s3 ? '模型已完美拟合非线性边界' : '若不达标，请尝试调整隐藏层节点数或学习率' 
      },
    ]
  }, [run])

  const doneCount = steps.filter((s) => s.done).length

  return (
    <div className="h-full w-full bg-slate-950 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Brain className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">实验室：神经网络反向传播</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(doneCount / steps.length) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                任务进度: {doneCount}/{steps.length}
              </span>
            </div>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          onClick={() => editorInsertText({ text: `\n${labCode}\n`, ensureNewline: true, mode: 'end' })}
        >
          <PlayCircle className="w-3.5 h-3.5" />
          加载练习模板
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        <div className="grid gap-3">
          {steps.map((s, idx) => (
            <motion.div 
              key={s.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
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
                  <span className="text-[10px] font-black uppercase text-emerald-500/40 tracking-widest">Done</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 flex gap-3">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider">专家指导</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              螺旋数据集是典型的<span className="text-amber-400">非线性可分</span>数据。你必须在隐藏层使用激活函数（如 tanh 或 ReLU），并正确推导其导数。如果 Loss 震荡不下降，请检查权重初始化范围。
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between px-2 py-3 bg-slate-900/80 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">实时监控 (Last Run)</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>
              <span className="text-[11px] font-mono text-slate-300">Loss: {metricSeries(run, 'loss').slice(-1)[0]?.value?.toFixed(4) ?? '---'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[11px] font-mono text-slate-300">Acc: {metricSeries(run, 'accuracy').slice(-1)[0]?.value?.toFixed(4) ?? '---'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
