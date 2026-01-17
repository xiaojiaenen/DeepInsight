import React from 'react'
import { VisualCanvas } from './VisualCanvas'

export const VisualPanel: React.FC = () => {
  return (
    <div className="w-full h-full relative bg-slate-50">
      <VisualCanvas />
      <div className="absolute left-3 top-3 text-xs text-slate-500 bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200">
        输出 "__VIS__ : &lt;JSON&gt;" 可驱动可视化
      </div>
    </div>
  )
}
