import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { TerminalSquare, XCircle, Eraser } from 'lucide-react';
import { subscribeTerminalClear, subscribeTerminalWrite, terminalClear } from '../../lib/terminalBus';
import { RunsPanel } from '../runs/RunsPanel';
import { clearRuns } from '../../features/runs/runsStore';
import { LinearRegressionLab } from '../labs/LinearRegressionLab';
import { subscribeHw, type HwSnapshot } from '../../features/hw/hwStore';
import { clearOomAnalysis, subscribeOom, type OomAnalysis } from '../../features/oom/oomStore';
import { subscribeTraceLocation, clearTraceLocation, type TraceLocation } from '../../features/trace/traceStore';
import { editorOpenFile } from '../../lib/editorBus';

interface TerminalPanelProps {
  pythonBadge?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ pythonBadge }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [tab, setTab] = useState<'terminal' | 'runs' | 'lab'>('terminal');
  const [hw, setHw] = useState<HwSnapshot | null>(null);
  const [oom, setOom] = useState<OomAnalysis | null>(null);
  const [trace, setTrace] = useState<TraceLocation | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

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
    fitRef.current = fitAddon;

    term.open(terminalRef.current);
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try {
          fitAddon.fit();
        } catch (e) {
          void e
        }
      });
    });

    term.writeln('\x1b[1;34m➜\x1b[0m DeepInsight Kernel \x1b[32m● Online\x1b[0m');
    term.writeln('\x1b[2mType "help" to learn more about commands.\x1b[0m');
    term.write('\r\n$ ');

    xtermRef.current = term;

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        void e
      }
    });
    resizeObserver.observe(terminalRef.current);

    const unsubscribeWrite = subscribeTerminalWrite((text) => {
      term.write(text);
    });

    const unsubscribeClear = subscribeTerminalClear(() => {
      term.reset();
      term.write('$ ');
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      unsubscribeWrite();
      unsubscribeClear();
      resizeObserver.disconnect();
      term.dispose();
      fitRef.current = null;
    };
  }, []);

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
    if (tab !== 'terminal') return;
    const fitAddon = fitRef.current;
    if (!fitAddon) return;
    try {
      fitAddon.fit();
    } catch (e) {
      void e
    }
  }, [tab]);

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
        </div>
        
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
          <div className="flex-1 min-h-0 p-2 pl-3 overflow-hidden">
            <div ref={terminalRef} className="w-full h-full" />
          </div>
        </div>
        <div className={`${tab === 'runs' ? 'block' : 'hidden'} h-full`}>
          <RunsPanel embedded />
        </div>
        <div className={`${tab === 'lab' ? 'block' : 'hidden'} h-full`}>
          <LinearRegressionLab />
        </div>
      </div>
    </div>
  );
};
