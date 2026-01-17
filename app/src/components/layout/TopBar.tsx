import React from 'react'
import { Play } from 'lucide-react'
import { WindowControls } from '../window/WindowControls'

type TopBarProps = {
  onRun?: () => void
  title?: string
  subtitle?: string
}

export const TopBar: React.FC<TopBarProps> = ({ onRun, title = '未命名项目', subtitle = '本地运行' }) => {
  const dragStyle: (React.CSSProperties & { WebkitAppRegion: 'drag' }) = { WebkitAppRegion: 'drag' }
  const noDragStyle: (React.CSSProperties & { WebkitAppRegion: 'no-drag' }) = { WebkitAppRegion: 'no-drag' }

  return (
    <div
      className="h-12 border-b border-slate-100 flex items-center px-3 bg-white"
      style={dragStyle}
    >
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span className="font-medium text-slate-900">{title}</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">{subtitle}</span>
      </div>

      <div className="ml-auto flex items-center gap-2" style={noDragStyle}>
        <button
          className="h-9 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          onClick={() => onRun?.()}
        >
          <Play className="w-4 h-4 fill-white" />
          运行
        </button>
        <WindowControls />
      </div>
    </div>
  )
}
