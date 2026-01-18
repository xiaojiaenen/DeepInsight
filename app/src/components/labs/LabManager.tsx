import React, { useState } from 'react'
import { LinearRegressionLab } from './LinearRegressionLab'
import { NNBackpropLab } from './NNBackpropLab'
import { CNNLab } from './CNNLab'
import { TransformerLab } from './TransformerLab'
import { RLLab } from './RLLab'
import { ChevronRight, FlaskConical, GraduationCap } from 'lucide-react'

type LabId = 'linear-regression' | 'nn-backprop' | 'cnn' | 'transformer' | 'rl'

interface LabInfo {
  id: LabId
  title: string
  description: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
}

const labs: LabInfo[] = [
  {
    id: 'linear-regression',
    title: '线性回归与指标追踪',
    description: '学习如何使用梯度下降拟合一条直线，并配置 MLOps 指标追踪。',
    difficulty: 'Easy',
    tags: ['Machine Learning', 'Optimization']
  },
  {
    id: 'nn-backprop',
    title: '神经网络反向传播',
    description: '手写实现一个 2 层 MLP，在非线性螺旋数据集上进行分类。',
    difficulty: 'Medium',
    tags: ['Deep Learning', 'Calculus']
  },
  {
    id: 'cnn',
    title: '卷积神经网络 (CNN)',
    description: '构建一个处理图像数据的 CNN，掌握卷积、池化和数据增强。',
    difficulty: 'Medium',
    tags: ['Computer Vision', 'Deep Learning']
  },
  {
    id: 'transformer',
    title: 'Transformer 核心机制',
    description: '深入理解 Self-Attention 机制，并实现一个简单的多头注意力层。',
    difficulty: 'Hard',
    tags: ['NLP', 'Architecture']
  },
  {
    id: 'rl',
    title: '强化学习 (RL)',
    description: '在 GridWorld 环境中实现 Q-Learning，掌握探索与利用的平衡。',
    difficulty: 'Hard',
    tags: ['Reinforcement Learning', 'Control']
  }
]

export const LabManager: React.FC = () => {
  const [activeLab, setActiveLab] = useState<LabId | null>(null)

  if (activeLab === 'linear-regression') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center">
          <button 
            onClick={() => setActiveLab(null)}
            className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 flex items-center gap-1"
          >
            <FlaskConical className="w-3 h-3" />
            Lab 列表
          </button>
          <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />
          <span className="text-[11px] font-medium text-slate-900">线性回归</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <LinearRegressionLab />
        </div>
      </div>
    )
  }

  if (activeLab === 'nn-backprop') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center">
          <button 
            onClick={() => setActiveLab(null)}
            className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 flex items-center gap-1"
          >
            <FlaskConical className="w-3 h-3" />
            Lab 列表
          </button>
          <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />
          <span className="text-[11px] font-medium text-slate-900">神经网络</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <NNBackpropLab />
        </div>
      </div>
    )
  }

  if (activeLab === 'cnn') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center">
          <button 
            onClick={() => setActiveLab(null)}
            className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 flex items-center gap-1"
          >
            <FlaskConical className="w-3 h-3" />
            Lab 列表
          </button>
          <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />
          <span className="text-[11px] font-medium text-slate-900">卷积神经网络</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <CNNLab />
        </div>
      </div>
    )
  }

  if (activeLab === 'transformer') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center">
          <button 
            onClick={() => setActiveLab(null)}
            className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 flex items-center gap-1"
          >
            <FlaskConical className="w-3 h-3" />
            Lab 列表
          </button>
          <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />
          <span className="text-[11px] font-medium text-slate-900">Transformer</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <TransformerLab />
        </div>
      </div>
    )
  }

  if (activeLab === 'rl') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center">
          <button 
            onClick={() => setActiveLab(null)}
            className="text-[11px] font-medium text-slate-500 hover:text-emerald-600 flex items-center gap-1"
          >
            <FlaskConical className="w-3 h-3" />
            Lab 列表
          </button>
          <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />
          <span className="text-[11px] font-medium text-slate-900">强化学习</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <RLLab />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="px-4 py-6 border-b border-slate-100 bg-gradient-to-br from-emerald-50/50 to-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-emerald-200 shadow-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">DeepInsight Academy</h2>
            <p className="text-xs text-slate-500 font-medium">通过交互式练习掌握深度学习核心概念</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {labs.map((lab) => (
          <button
            key={lab.id}
            onClick={() => setActiveLab(lab.id)}
            className="w-full text-left group relative p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all shadow-sm hover:shadow-md"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                {lab.title}
              </h3>
              <span className={`
                text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider
                ${lab.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' : 
                  lab.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 
                  'bg-rose-100 text-rose-700'}
              `}>
                {lab.difficulty}
              </span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
              {lab.description}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lab.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">
                  {tag}
                </span>
              ))}
            </div>
            <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
              <ChevronRight className="w-5 h-5 text-emerald-400" />
            </div>
          </button>
        ))}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <div className="text-[11px] text-slate-400 text-center font-medium italic">
          "The best way to understand an algorithm is to implement it from scratch."
        </div>
      </div>
    </div>
  )
}
