import React from 'react'
import { Play, Square, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { WindowControls } from '../window/WindowControls'

type TopBarProps = {
  isRunning?: boolean
  onRun?: () => void
  onStop?: () => void
  title?: string
  subtitle?: string
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
}

export const TopBar: React.FC<TopBarProps> = ({
  isRunning,
  onRun,
  onStop,
  title = '未命名项目',
  subtitle = '本地运行',
  saveStatus = 'idle'
}) => {
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
        
        {saveStatus !== 'idle' && (
          <div className="ml-4 flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-left-2 duration-300">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                <span className="text-[10px] font-medium text-slate-500">正在保存...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[10px] font-medium text-slate-500">更改已保存</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span className="text-[10px] font-medium text-slate-500">保存失败</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2" style={noDragStyle}>
        {isRunning ? (
          <button
            className="h-9 px-4 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            onClick={() => onStop?.()}
          >
            <Square className="w-4 h-4 fill-white" />
            停止
          </button>
        ) : (
          <button
            className="h-9 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            onClick={() => onRun?.()}
          >
            <Play className="w-4 h-4 fill-white" />
            运行
          </button>
        )}
        <WindowControls />
      </div>
    </div>
  )
}
