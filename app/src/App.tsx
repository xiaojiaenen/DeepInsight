import React, { useEffect, useRef, useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { CodeEditor } from './components/editor/CodeEditor';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { KernelClient, type KernelMessage } from './lib/kernelClient';
import { terminalClear, terminalWrite, terminalWriteLine } from './lib/terminalBus';

function App() {
  const [code, setCode] = useState(
    "# 在此编写 Python 代码\nimport numpy as np\n\nprint('你好，DeepInsight')\n",
  );
  const [pythonBadge, setPythonBadge] = useState<string>('');

  const clientRef = useRef<KernelClient | null>(null);

  useEffect(() => {
    const client = new KernelClient({
      onStatus: (s) => {
        if (s === 'connecting') terminalWriteLine('正在连接 Kernel...')
        if (s === 'open') terminalWriteLine('Kernel 已连接。')
        if (s === 'closed') terminalWriteLine('Kernel 连接已断开。')
        if (s === 'error') terminalWriteLine('Kernel 连接发生错误。')
      },
      onMessage: (msg: KernelMessage) => {
        if (msg.type === 'hello') {
          const full = (msg.python ?? '').trim()
          const version = full.split(' ')[0] ?? ''
          if (version) setPythonBadge(version)
          terminalWriteLine(`Python: ${full}`)
          if (msg.executable) terminalWriteLine(`解释器: ${msg.executable}`)
          return
        }
        if (msg.type === 'start') {
          terminalWriteLine('开始运行...')
          return
        }
        if (msg.type === 'stdout') {
          terminalWrite(msg.data)
          return
        }
        if (msg.type === 'stderr') {
          terminalWrite(msg.data)
          return
        }
        if (msg.type === 'done') {
          if (msg.timed_out) terminalWriteLine('运行超时。')
          terminalWriteLine(`进程退出码: ${msg.exit_code}`)
          terminalWriteLine('运行结束。')
          return
        }
        if (msg.type === 'error') {
          terminalWriteLine(`错误: ${msg.message}`)
        }
      },
    });

    client.connect();
    clientRef.current = client;

    return () => {
      clientRef.current = null;
    };
  }, []);

  const handleRun = () => {
    terminalClear();
    terminalWriteLine('DeepInsight 运行器')
    terminalWriteLine('--------------------------------')
    clientRef.current?.exec(code, 30);
  };

  return (
    <MainLayout onRun={handleRun}>
      <div className="flex flex-col h-full">
        {/* Top: Visualization & Editor Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Visualization (Placeholder for now) */}
          <div className="w-1/2 bg-slate-50 flex items-center justify-center relative border-r border-slate-200">
             <div className="text-slate-400 font-mono tracking-widest bg-white px-4 py-2 rounded shadow-sm border border-slate-100">
               [可视化模块离线]
             </div>
             {/* Dot Grid Background */}
             <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          </div>

          {/* Right: Code Editor */}
          <div className="w-1/2 bg-white">
            <CodeEditor value={code} onChange={setCode} />
          </div>
        </div>

        {/* Bottom: Terminal */}
        <div className="h-48">
          <TerminalPanel pythonBadge={pythonBadge} />
        </div>
      </div>
    </MainLayout>
  );
}

export default App;
