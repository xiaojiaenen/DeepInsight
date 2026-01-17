import React from 'react'
import { CodeEditor } from '../components/editor/CodeEditor'
import { TerminalPanel } from '../components/terminal/TerminalPanel'

type WorkspacePageProps = {
  code: string
  onChangeCode: (code: string) => void
  pythonBadge: string
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ code, onChangeCode, pythonBadge }) => {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 min-w-0 bg-slate-50 flex items-center justify-center relative border-b lg:border-b-0 lg:border-r border-slate-200">
          <div className="text-slate-400 font-mono tracking-widest bg-white px-4 py-2 rounded shadow-sm border border-slate-100">
            [可视化模块离线]
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        </div>

        <div className="flex-1 min-w-0 bg-white">
          <CodeEditor value={code} onChange={onChangeCode} />
        </div>
      </div>

      <div className="h-[220px] shrink-0">
        <TerminalPanel pythonBadge={pythonBadge} />
      </div>
    </div>
  )
}

