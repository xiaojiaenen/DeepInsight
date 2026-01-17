import React from 'react'
import { CodeEditor } from '../components/editor/CodeEditor'
import { TerminalPanel } from '../components/terminal/TerminalPanel'
import { VisualPanel } from '../components/visual/VisualPanel'

type WorkspacePageProps = {
  code: string
  onChangeCode: (code: string) => void
  pythonBadge: string
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({ code, onChangeCode, pythonBadge }) => {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 min-w-0 relative border-b lg:border-b-0 lg:border-r border-slate-200">
          <VisualPanel />
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
