import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Database, 
  Github, 
  Info,
  Layers,
  Unplug,
  Wifi,
  WifiOff,
  RefreshCw,
  Save,
  Loader2
} from 'lucide-react';
import type { KernelStatus } from '../../features/kernel/useKernel';
import { cn } from './cn';

interface GlobalStatusBarProps {
  status?: string;
  version?: string;
  kernelStatus?: KernelStatus;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

export const GlobalStatusBar: React.FC<GlobalStatusBarProps> = ({ 
  status = '就绪',
  version = 'v0.0.1',
  kernelStatus = 'closed',
  saveStatus = 'idle'
}) => {
  const getKernelStatusInfo = () => {
    switch (kernelStatus) {
      case 'open':
        return { label: 'Kernel 已连接', color: 'text-emerald-400', icon: Wifi };
      case 'connecting':
        return { label: '正在连接 Kernel', color: 'text-amber-400', icon: RefreshCw, animate: true };
      case 'error':
        return { label: 'Kernel 错误', color: 'text-red-400', icon: Unplug };
      case 'closed':
      default:
        return { label: 'Kernel 已断开', color: 'text-slate-400', icon: WifiOff };
    }
  };

  const kernelInfo = getKernelStatusInfo();

  return (
    <footer className="h-7 bg-slate-900 text-white/70 flex items-center justify-between px-3 text-[10px] select-none shrink-0 z-50 font-medium border-t border-white/5 shadow-[0_-1px_3px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-0 h-full">
        <div className="flex items-center gap-1.5 px-3 h-full hover:bg-white/5 cursor-pointer transition-colors border-r border-white/5 group">
          <Info className="w-3 h-3 text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="text-white/90">DeepInsight</span>
        </div>
        
        <div className={cn(
          "flex items-center gap-2 px-3 h-full transition-colors border-r border-white/5 bg-white/5",
          kernelInfo.color
        )}>
          <kernelInfo.icon className={cn("w-3.5 h-3.5", kernelInfo.animate && "animate-spin")} />
          <span className="font-bold tracking-tight uppercase opacity-50 text-[9px] mr-1">Kernel</span>
          <span className="font-bold">{kernelInfo.label}</span>
        </div>

        {saveStatus !== 'idle' && (
          <div className="flex items-center gap-1.5 px-3 h-full border-r border-white/5 text-white/60">
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                <span>正在保存...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Save className="w-3 h-3 text-emerald-400" />
                <span>已保存所有更改</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 text-red-400" />
                <span>保存失败</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-0 h-full">
        <div className="flex items-center gap-1.5 px-3 h-full hover:bg-white/5 cursor-pointer transition-colors border-l border-white/5">
          <Layers className="w-3 h-3" />
          <span>开发模式</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 h-full hover:bg-white/5 cursor-pointer transition-colors border-l border-white/5">
          <Database className="w-3 h-3" />
          <span>本地存储</span>
        </div>
        
        <div className="flex items-center gap-1.5 px-3 h-full border-l border-white/5">
          <Clock className="w-3 h-3" />
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 h-full bg-slate-800 hover:bg-slate-700 cursor-pointer transition-colors border-l border-white/5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span className="text-white/90">系统健康</span>
        </div>

        <div className="flex items-center px-3 h-full bg-black/40 border-l border-white/5">
          <span className="font-bold opacity-50 tracking-wider">{version}</span>
        </div>
      </div>
    </footer>
  );
};