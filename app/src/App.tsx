import { useEffect, useState } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { useKernel } from './features/kernel/useKernel'
import { WorkspacePage } from './pages/WorkspacePage'
import { NotesPage } from './pages/NotesPage'
import { getProjectState } from './features/files/filesStore'
import { getWorkspaceState, subscribeWorkspace } from './features/workspace/workspaceStore'
import { terminalWriteLine } from './lib/terminalBus'
import type { MainTab } from './components/layout/Sidebar'

function App() {
  const { pythonBadge, isRunning, status, runProject, runWorkspace, stop } = useKernel()
  const [activeTab, setActiveTab] = useState<MainTab>('workspace')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    return subscribeWorkspace((ws) => {
      setSaveStatus(ws.saveStatus)
    })
  }, [])

  const runFile = (path: string) => {
    const ws = getWorkspaceState()
    if (typeof window.workspace !== 'undefined' && ws.root) {
      runWorkspace(ws.root, path)
      return
    }
    const s = getProjectState()
    const files = s.files.map((f) => ({ path: f.path, content: f.content }))
    runProject(files, path)
  }

  const runActive = () => {
    const ws = getWorkspaceState()
    if (typeof window.workspace !== 'undefined' && ws.root) {
      const p = ws.activePath
      if (p && p.endsWith('.py')) runWorkspace(ws.root, p)
      else terminalWriteLine('请选择一个 .py 文件后再运行（可在文件树右键运行）。')
      return
    }
    const s = getProjectState()
    const active = s.files.find((x) => x.id === s.activeFileId) ?? s.files[0]
    const entry = (active?.path ?? 'main.py').toString()
    const files = s.files.map((f) => ({ path: f.path, content: f.content }))
    runProject(files, entry)
  }

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isRunning={isRunning}
      onRun={runActive}
      onStop={stop}
      kernelStatus={status}
      saveStatus={saveStatus}
    >
      {activeTab === 'workspace' && (
        <WorkspacePage pythonBadge={pythonBadge} onRun={runActive} onRunFile={runFile} onStop={stop} isRunning={isRunning} />
      )}
      {activeTab === 'notes' && (
        <NotesPage />
      )}
      {activeTab === 'settings' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
          <div className="text-2xl font-bold text-slate-900 mb-2">设置</div>
          <p className="text-slate-500">配置您的 DeepInsight 体验</p>
        </div>
      )}
    </MainLayout>
  )
}

export default App
