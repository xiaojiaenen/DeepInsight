import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { TerminalSquare, XCircle, Eraser } from 'lucide-react';
import { subscribeTerminalClear, subscribeTerminalWrite, terminalClear } from '../../lib/terminalBus';

interface TerminalPanelProps {
  pythonBadge?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ pythonBadge }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

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

    term.open(terminalRef.current);
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try {
          fitAddon.fit();
        } catch {
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
      } catch {
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
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-background border-t border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border h-10">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TerminalSquare className="w-4 h-4" />
          <span>终端</span>
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-2">
            {pythonBadge ? `Python ${pythonBadge}` : 'Python 未知'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title="清除"
            onClick={() => terminalClear()}
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title="关闭"
            onClick={() => terminalClear()}
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative p-2 pl-3">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};
