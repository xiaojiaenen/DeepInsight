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
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeEditor value={code} onChange={onChangeCode} />
      </div>

      <div className="h-[220px] shrink-0">
        <TerminalPanel pythonBadge={pythonBadge} />
      </div>
    </div>
  )
}
