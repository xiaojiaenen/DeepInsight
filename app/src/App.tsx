import { useEffect, useState } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { useKernel } from './features/kernel/useKernel'
import { WorkspacePage } from './pages/WorkspacePage'
import { AnimationLibraryPage } from './pages/AnimationLibraryPage'

function App() {
  const [activePage, setActivePage] = useState<'workspace' | 'library'>('workspace')
  const [code, setCode] = useState(
    '# 在此编写 Python 代码\n# 指标（MLOps 风格）：print(\'__METRIC__ : {"name":"loss","value":0.42,"step":1}\')\n\nimport numpy as np\n\nprint("你好，DeepInsight")\n',
  )
  const { pythonBadge, isRunning, run, stop } = useKernel()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('deepinsight:activePage')
      if (raw === 'library' || raw === 'workspace') setActivePage(raw)
    } catch (e) {
      void e
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('deepinsight:activePage', activePage)
    } catch (e) {
      void e
    }
  }, [activePage])

  return (
    <MainLayout
      isRunning={isRunning}
      onRun={() => run(code)}
      onStop={stop}
      activePage={activePage}
      onNavigate={setActivePage}
    >
      {activePage === 'library' ? (
        <AnimationLibraryPage />
      ) : (
        <WorkspacePage code={code} onChangeCode={setCode} pythonBadge={pythonBadge} />
      )}
    </MainLayout>
  )
}

export default App
