import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Cpu, 
  Database, 
  Github, 
  Info,
  Layers
} from 'lucide-react';

interface GlobalStatusBarProps {
  status?: string;
  version?: string;
}

export const GlobalStatusBar: React.FC<GlobalStatusBarProps> = ({ 
  status = '就绪',
  version = 'v0.0.1'
}) => {
  return (
    <footer className="h-6 bg-indigo-600 text-white flex items-center justify-between px-3 text-[10px] select-none shrink-0 z-50 font-medium">
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-1.5 bg-white/10 h-full px-2 hover:bg-white/20 cursor-pointer transition-colors">
          <Info className="w-3 h-3" />
          <span>DeepInsight {status}</span>
        </div>
        
        <div className="flex items-center gap-1.5 hover:bg-white/10 h-full px-2 cursor-pointer transition-colors">
          <Layers className="w-3 h-3" />
          <span>开发模式</span>
        </div>
      </div>

      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-1.5 hover:bg-white/10 h-full px-2 cursor-pointer transition-colors">
          <Database className="w-3 h-3" />
          <span>本地存储</span>
        </div>
        
        <div className="flex items-center gap-1.5 hover:bg-white/10 h-full px-2 cursor-pointer transition-colors border-l border-white/10">
          <Clock className="w-3 h-3" />
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-indigo-700 h-full px-3 hover:bg-indigo-800 cursor-pointer transition-colors">
          <CheckCircle2 className="w-3 h-3 text-emerald-300" />
          <span>系统健康</span>
        </div>

        <div className="flex items-center gap-1.5 bg-indigo-800 h-full px-3">
          <span className="font-bold opacity-80">{version}</span>
        </div>
      </div>
    </footer>
  );
};