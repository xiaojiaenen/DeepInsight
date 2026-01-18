import React from 'react'
import { Code, Hexagon, Settings, StickyNote, Wifi, WifiOff, RefreshCw, Unplug } from 'lucide-react'
import { cn } from './cn'
import type { KernelStatus } from '../../features/kernel/useKernel'

export type MainTab = 'workspace' | 'notes' | 'settings'

interface SidebarProps {
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
  kernelStatus?: KernelStatus
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, kernelStatus = 'closed' }) => {
  const dragStyle: (React.CSSProperties & { WebkitAppRegion: 'drag' }) = { WebkitAppRegion: 'drag' }
  const noDragStyle: (React.CSSProperties & { WebkitAppRegion: 'no-drag' }) = { WebkitAppRegion: 'no-drag' }

  const getKernelInfo = () => {
    switch (kernelStatus) {
      case 'open':
        return { label: '内核已就绪', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: Wifi };
      case 'connecting':
        return { label: '内核连接中', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: RefreshCw, animate: true };
      case 'error':
        return { label: '内核错误', color: 'text-red-500', bg: 'bg-red-500/10', icon: Unplug };
      default:
        return { label: '内核未连接', color: 'text-slate-400', bg: 'bg-slate-100', icon: WifiOff };
    }
  };

  const kernel = getKernelInfo();

  return (
    <aside className="w-56 flex flex-col bg-slate-50 border-r border-slate-200">
      <div className="h-12 px-4 flex items-center gap-3" style={dragStyle}>
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

      <nav className="flex-1 px-3 py-3 flex flex-col gap-1" style={noDragStyle}>
        <NavItem 
          icon={<Code className="w-4 h-4" />} 
          label="工作台" 
          active={activeTab === 'workspace'} 
          onClick={() => onTabChange('workspace')}
        />
        <NavItem 
          icon={<StickyNote className="w-4 h-4" />} 
          label="笔记" 
          active={activeTab === 'notes'} 
          onClick={() => onTabChange('notes')}
        />
        
        <div className="mt-4 px-3 py-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">系统状态</div>
          <div className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-xl border border-transparent transition-all",
            kernel.bg
          )}>
            <kernel.icon className={cn("w-3.5 h-3.5", kernel.color, kernel.animate && "animate-spin")} />
            <span className={cn("text-[11px] font-bold", kernel.color)}>{kernel.label}</span>
          </div>
        </div>

        <div className="flex-1" />
        <NavItem 
          icon={<Settings className="w-4 h-4" />} 
          label="设置" 
          active={activeTab === 'settings'} 
          onClick={() => onTabChange('settings')}
        />
      </nav>
    </aside>
  )
}

const NavItem = ({
  icon,
  active,
  label,
  onClick,
}: {
  icon: React.ReactNode
  active?: boolean
  label: string
  onClick?: () => void
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full h-10 px-3 rounded-lg flex items-center gap-3 text-sm transition-colors',
      active ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'text-slate-600 hover:bg-white hover:text-slate-900',
    )}
  >
    <span className={cn('text-slate-500', active && 'text-blue-600')}>{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
)
