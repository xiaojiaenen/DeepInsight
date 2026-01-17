import { useState } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import { useKernel } from './features/kernel/useKernel'
import { WorkspacePage } from './pages/WorkspacePage'

function App() {
  const [code, setCode] = useState(
    '# 在此编写 Python 代码\n# 提示：输出一行 "__VIS__ : <JSON>" 可驱动左侧 3D 画布\n# cube：print(\'__VIS__ : {"cubeRotation":[0,1.2,0],"cubeColor":"#ef4444"}\')\n# tween：print(\'__VIS__ : {"kind":"tween","to":{"cubeRotation":[0,3.14,0]},"durationMs":800}\')\n# matrix：print(\'__VIS__ : {"mode":"matrix","matrix2x2":[[1,0.8],[0,1]]}\')\n\nimport numpy as np\n\nprint("你好，DeepInsight")\n',
  )
  const { pythonBadge, isRunning, run, stop } = useKernel()

  return (
    <MainLayout isRunning={isRunning} onRun={() => run(code)} onStop={stop}>
      <WorkspacePage code={code} onChangeCode={setCode} pythonBadge={pythonBadge} />
    </MainLayout>
  )
}

export default App
