import { useState } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { useKernel } from './features/kernel/useKernel'
import { WorkspacePage } from './pages/WorkspacePage'

function App() {
  const [code, setCode] = useState(
    "# 在此编写 Python 代码\nimport numpy as np\n\nprint('你好，DeepInsight')\n",
  )
  const { pythonBadge, run } = useKernel()

  return (
    <MainLayout onRun={() => run(code)}>
      <WorkspacePage code={code} onChangeCode={setCode} pythonBadge={pythonBadge} />
    </MainLayout>
  )
}

export default App;
