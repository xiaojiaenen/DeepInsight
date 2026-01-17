import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Terminal, Code, Settings, Play, Hexagon, Minus, Square, X } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  onRun?: () => void;
}

export const MainLayout: React.FC<LayoutProps> = ({ children, onRun }) => {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">
      <aside className="w-56 flex flex-col bg-slate-50 border-r border-slate-200">
        <div className="h-12 px-4 flex items-center gap-3" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="relative w-9 h-9 flex items-center justify-center cursor-default">
            <div className="absolute inset-0 bg-blue-500/15 rounded-xl rotate-6" />
            <div className="absolute inset-0 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-600/25">
              <Hexagon className="text-white w-5 h-5 fill-white/20" strokeWidth={2.5} />
            </div>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">DeepInsight</div>
            <div className="text-xs text-slate-500">AI Studio</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 flex flex-col gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <NavItem icon={<Code className="w-4 h-4" />} label="代码编辑" active />
          <NavItem icon={<Terminal className="w-4 h-4" />} label="终端输出" />
          <div className="flex-1" />
          <NavItem icon={<Settings className="w-4 h-4" />} label="设置" />
        </nav>

        <div className="px-3 pb-3" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            className="w-full h-10 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            onClick={() => onRun?.()}
          >
            <Play className="w-4 h-4 fill-white" />
            运行
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-white">
        <div className="h-10 border-b border-slate-100 flex items-center justify-end px-2 bg-white" style={{ WebkitAppRegion: 'drag' } as any}>
          <div style={{ WebkitAppRegion: 'no-drag' } as any}>
            <WindowControls />
          </div>
        </div>

        <div className="flex-1 relative">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({
  icon,
  active,
  label,
}: {
  icon: React.ReactNode;
  active?: boolean;
  label: string;
}) => (
  <button
    className={cn(
      'w-full h-10 px-3 rounded-lg flex items-center gap-3 text-sm transition-colors',
      active
        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
        : 'text-slate-600 hover:bg-white hover:text-slate-900',
    )}
  >
    <span className="text-slate-500">{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
);

const WindowControls = () => {
  const api = (window as any).windowControls as
    | {
        minimize: () => Promise<void>;
        toggleMaximize: () => Promise<void>;
        close: () => Promise<void>;
      }
    | undefined;

  return (
    <div className="flex items-center gap-1">
      <button
        className="w-10 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
        onClick={() => api?.minimize()}
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        className="w-10 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
        onClick={() => api?.toggleMaximize()}
      >
        <Square className="w-3.5 h-3.5" />
      </button>
      <button
        className="w-10 h-8 rounded-md hover:bg-red-50 flex items-center justify-center text-slate-600 hover:text-red-600"
        onClick={() => api?.close()}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
