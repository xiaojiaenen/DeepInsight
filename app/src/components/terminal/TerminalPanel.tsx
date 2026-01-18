import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { 
  TerminalSquare, 
  Terminal as TerminalIcon,
  XCircle, 
  Eraser, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Plus,
  X
} from 'lucide-react';
import { subscribeTerminalClear, subscribeTerminalWrite, terminalClear } from '../../lib/terminalBus';
import { RunsPanel } from '../runs/RunsPanel';
import { clearRuns } from '../../features/runs/runsStore';
import { LabManager } from '../labs/LabManager';
import { subscribeHw, type HwSnapshot } from '../../features/hw/hwStore';
import { clearOomAnalysis, subscribeOom, type OomAnalysis } from '../../features/oom/oomStore';
import { subscribeTraceLocation, clearTraceLocation, type TraceLocation } from '../../features/trace/traceStore';
import { editorOpenFile } from '../../lib/editorBus';

interface TerminalPanelProps {
  pythonBadge?: string;
}

type Tab = 'terminal' | 'runs' | 'lab' | 'problems'

interface TerminalInstance {
  id: string
  name: string
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ pythonBadge }) => {
  const terminalContainersRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const terminalInstancesRef = useRef<Map<string, { term: Terminal, fit: FitAddon }>>(new Map())
  const [tab, setTab] = useState<Tab>('terminal')
  const [terminals, setTerminals] = useState<TerminalInstance[]>([
    { id: '1', name: 'bash' }
  ])
  const [activeTerminalId, setActiveTerminalId] = useState('1')
  
  // Missing states from previous version
  const [hw, setHw] = useState<HwSnapshot | null>(null);
  const [oom, setOom] = useState<OomAnalysis | null>(null);
  const [trace, setTrace] = useState<TraceLocation | null>(null);
  const [markers, setMarkers] = useState<any[]>([]); // Assuming markers are handled elsewhere or need definition

  const createTerminalInstance = (id: string) => {
    if (terminalInstancesRef.current.has(id)) return terminalInstancesRef.current.get(id);

    const term = new Terminal({
      convertEol: true,
      theme: {
        background: '#ffffff',
        foreground: '#374151',
        cursor: '#3b82f6',
        selectionBackground: 'rgba(59, 130, 246, 0.15)',
        black: '#000000',
        red: '#ef4444',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#d946ef',
        cyan: '#06b6d4',
        white: '#6b7280',
        brightBlack: '#4b5563',
        brightRed: '#f87171',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#e879f9',
        brightCyan: '#22d3ee',
        brightWhite: '#9ca3af',
      },
      fontFamily: "'JetBrains Mono', 'Menlo', 'Consolas', monospace",
      fontSize: 13,
      lineHeight: 1.25,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      allowTransparency: true,
      scrollback: 2000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    const instance = { term, fit: fitAddon };
    terminalInstancesRef.current.set(id, instance);
    return instance;
  };

  const addTerminal = () => {
    const newId = String(Date.now())
    setTerminals([...terminals, { id: newId, name: `bash ${terminals.length + 1}` }])
    setActiveTerminalId(newId)
  }

  const removeTerminal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (terminals.length === 1) return
    
    // Cleanup
    const instance = terminalInstancesRef.current.get(id);
    if (instance) {
      instance.term.dispose();
      terminalInstancesRef.current.delete(id);
    }
    terminalContainersRef.current.delete(id);

    const newTerminals = terminals.filter(t => t.id !== id)
    setTerminals(newTerminals)
    if (activeTerminalId === id) {
      setActiveTerminalId(newTerminals[newTerminals.length - 1].id)
    }
  }

  // Handle terminal initialization and resizing
  useEffect(() => {
    terminals.forEach(t => {
      const container = terminalContainersRef.current.get(t.id);
      if (container && !terminalInstancesRef.current.get(t.id)?.term.element) {
        const { term, fit } = createTerminalInstance(t.id)!;
        term.open(container);
        
        term.writeln(`\x1b[1;34m➜\x1b[0m DeepInsight Terminal \x1b[32m[${t.name}]\x1b[0m`);
        term.write('\r\n$ ');

        setTimeout(() => {
          try { fit.fit(); } catch (e) {}
        }, 100);
      }
    });
  }, [terminals]);

  // Handle active terminal resize
  useEffect(() => {
    const instance = terminalInstancesRef.current.get(activeTerminalId);
    if (instance && tab === 'terminal') {
      setTimeout(() => {
        try { instance.fit.fit(); } catch (e) {}
      }, 50);
    }
  }, [activeTerminalId, tab]);

  useEffect(() => {
    const unsubWrite = subscribeTerminalWrite((payload) => {
      const instance = terminalInstancesRef.current.get(activeTerminalId);
      if (instance) {
        instance.term.write(payload);
      }
    });
    const unsubClear = subscribeTerminalClear(() => {
      const instance = terminalInstancesRef.current.get(activeTerminalId);
      if (instance) {
        instance.term.clear();
      }
    });
    return () => {
      unsubWrite();
      unsubClear();
    };
  }, [activeTerminalId]);

  useEffect(() => {
    return subscribeHw((s) => setHw(s));
  }, []);

  useEffect(() => {
    return subscribeOom((o) => setOom(o));
  }, []);

  useEffect(() => {
    return subscribeTraceLocation((t) => setTrace(t));
  }, []);

  useEffect(() => {
    const updateMarkers = () => {
      const monaco = (window as any).monaco;
      if (monaco && monaco.editor) {
        const markers = monaco.editor.getModelMarkers({});
        setMarkers(markers);
      }
    };

    updateMarkers();

    if ((window as any).monaco && (window as any).monaco.editor) {
      const editor = (window as any).monaco.editor;
      if (typeof editor.onDidChangeMarkers === 'function') {
        const disposable = editor.onDidChangeMarkers(() => {
          updateMarkers();
        });
        return () => disposable.dispose();
      }
    }
    
    // Fallback if monaco is not yet loaded
    const interval = setInterval(() => {
      if ((window as any).monaco) {
        updateMarkers();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const gpu0 = hw?.gpus?.[0] ?? null;
  const gpuText = (() => {
    if (!hw) return 'GPU: --'
    if (hw.error) return 'GPU: N/A'
    if (!gpu0) return 'GPU: N/A'
    const vram = `${gpu0.memory_used_mb}/${gpu0.memory_total_mb}MB`
    return `GPU${gpu0.index} ${gpu0.utilization_gpu}% · VRAM ${vram} · ${gpu0.temperature_c}°C`
  })()

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-background border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border h-10">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <button
            className={`flex items-center gap-2 px-2 py-1 rounded ${tab === 'terminal' ? 'bg-white text-slate-900 border border-slate-200' : 'hover:bg-muted'}`}
            onClick={() => setTab('terminal')}
          >
            <TerminalSquare className="w-4 h-4" />
            <span>终端</span>
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-1">
              {pythonBadge ? `Python ${pythonBadge}` : 'Python 未知'}
            </span>
          </button>
          <button
            className={`px-2 py-1 rounded ${tab === 'runs' ? 'bg-white text-slate-900 border border-slate-200' : 'hover:bg-muted'}`}
            onClick={() => setTab('runs')}
          >
            Runs
          </button>
          <button
            className={`px-2 py-1 rounded ${tab === 'lab' ? 'bg-white text-slate-900 border border-slate-200' : 'hover:bg-muted'}`}
            onClick={() => setTab('lab')}
          >
            Lab
          </button>
          <button
            className={`px-2 py-1 rounded flex items-center gap-1.5 ${tab === 'problems' ? 'bg-white text-slate-900 border border-slate-200' : 'hover:bg-muted'}`}
            onClick={() => setTab('problems')}
          >
            <span>问题</span>
            {markers.length > 0 && (
              <span className="flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {markers.length}
              </span>
            )}
          </button>
        </div>

        {tab === 'terminal' && (
          <div className="flex items-center gap-1 px-2 border-l border-slate-200 ml-2 overflow-x-auto no-scrollbar max-w-[400px]">
            {terminals.map(t => (
              <div
                key={t.id}
                onClick={() => setActiveTerminalId(t.id)}
                className={`
                  flex items-center gap-2 px-2 py-0.5 rounded cursor-pointer transition-all whitespace-nowrap
                  ${activeTerminalId === t.id ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'text-slate-500 hover:bg-slate-100'}
                `}
              >
                <TerminalIcon className="w-3 h-3" />
                <span className="text-[11px] font-medium">{t.name}</span>
                {terminals.length > 1 && (
                  <X 
                    className="w-2.5 h-2.5 hover:text-red-500 rounded-full hover:bg-red-50" 
                    onClick={(e) => removeTerminal(e, t.id)}
                  />
                )}
              </div>
            ))}
            <button 
              onClick={addTerminal}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 bg-white/80 border border-slate-200 px-2 py-1 rounded tabular-nums">
            {gpuText}
          </span>
          {trace ? (
            <button
              className="text-xs text-slate-700 bg-white/80 border border-slate-200 px-2 py-1 rounded tabular-nums hover:bg-slate-50"
              title="跳转到错误位置"
              onClick={() => editorOpenFile({ path: trace.path, lineNumber: trace.lineNumber })}
            >
              跳转 {trace.path}:{trace.lineNumber}
            </button>
          ) : null}
          {tab === 'terminal' ? (
            <>
              <button
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                title="清除"
                onClick={() => terminalClear()}
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
              {trace ? (
                <button
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="清除错误定位"
                  onClick={() => clearTraceLocation()}
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              ) : null}
              <button
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                title="关闭"
                onClick={() => terminalClear()}
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          ) : tab === 'runs' ? (
            <button
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              title="清空 Runs"
              onClick={() => clearRuns()}
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div className={`h-full min-h-0 ${tab === 'terminal' ? 'flex flex-col' : 'hidden'}`}>
          {oom ? (
            <div className="mx-3 mt-3 rounded border border-red-200 bg-red-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-red-800">显存分析器：检测到 OOM</div>
                <button
                  className="text-xs text-red-800 hover:bg-red-100 px-2 py-1 rounded border border-red-200 bg-white"
                  onClick={() => clearOomAnalysis()}
                >
                  关闭
                </button>
              </div>
              <div className="mt-1 text-xs text-red-900 break-words">{oom.message}</div>
              {oom.likely_location ? (
                <div className="mt-1 text-xs text-red-800">可能位置：{oom.likely_location}</div>
              ) : null}
              {oom.suggestions?.length ? (
                <div className="mt-2 text-xs text-red-800">
                  {oom.suggestions.slice(0, 5).map((s) => (
                    <div key={s}>- {s}</div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex-1 min-h-0 p-2 pl-3 overflow-hidden relative">
            {terminals.map(t => (
              <div 
                key={t.id} 
                ref={el => { if (el) terminalContainersRef.current.set(t.id, el) }} 
                className={`w-full h-full ${activeTerminalId === t.id ? 'block' : 'hidden'}`}
              />
            ))}
          </div>
        </div>
        <div className={`${tab === 'runs' ? 'block' : 'hidden'} h-full`}>
          <RunsPanel embedded />
        </div>
        <div className={`${tab === 'lab' ? 'block' : 'hidden'} h-full`}>
          <LabManager />
        </div>
        <div className={`${tab === 'problems' ? 'block' : 'hidden'} h-full overflow-y-auto custom-scrollbar bg-white`}>
          {markers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Info className="w-8 h-8 opacity-20" />
              <span className="text-sm">未检测到任何问题</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {markers.map((marker, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-2 hover:bg-slate-50 cursor-pointer group"
                  onClick={() => {
                    const path = marker.resource.path;
                    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
                    editorOpenFile({ path: cleanPath, lineNumber: marker.startLineNumber });
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    {marker.severity === 8 ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : marker.severity === 4 ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-slate-700 truncate">{marker.message}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        [{marker.startLineNumber}, {marker.startColumn}]
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">
                      {marker.resource.path.split('/').pop()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
