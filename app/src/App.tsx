import { MainLayout } from './components/layout/MainLayout'
import { useKernel } from './features/kernel/useKernel'
import { WorkspacePage } from './pages/WorkspacePage'
import { getProjectState } from './features/files/filesStore'
import { getWorkspaceState } from './features/workspace/workspaceStore'
import { terminalWriteLine } from './lib/terminalBus'

function App() {
  const { pythonBadge, isRunning, runProject, runWorkspace, stop } = useKernel()

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
      isRunning={isRunning}
      onRun={runActive}
      onStop={stop}
    >
      <WorkspacePage pythonBadge={pythonBadge} onRun={runActive} onRunFile={runFile} onStop={stop} isRunning={isRunning} />
    </MainLayout>
  )
}

export default App
