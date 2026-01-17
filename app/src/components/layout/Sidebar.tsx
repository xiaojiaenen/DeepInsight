import React from 'react'
import { BookOpen, Code, Hexagon, Settings } from 'lucide-react'
import { cn } from './cn'

export type SidebarPage = 'workspace' | 'library'

export const Sidebar: React.FC<{ activePage: SidebarPage; onNavigate?: (page: SidebarPage) => void }> = ({
  activePage,
  onNavigate,
}) => {
  const dragStyle: (React.CSSProperties & { WebkitAppRegion: 'drag' }) = { WebkitAppRegion: 'drag' }
  const noDragStyle: (React.CSSProperties & { WebkitAppRegion: 'no-drag' }) = { WebkitAppRegion: 'no-drag' }

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
        <NavItem icon={<Code className="w-4 h-4" />} label="工作台" active={activePage === 'workspace'} onClick={() => onNavigate?.('workspace')} />
        <NavItem
          icon={<BookOpen className="w-4 h-4" />}
          label="动画库"
          active={activePage === 'library'}
          onClick={() => onNavigate?.('library')}
        />
        <div className="flex-1" />
        <NavItem icon={<Settings className="w-4 h-4" />} label="设置" />
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
    className={cn(
      'w-full h-10 px-3 rounded-lg flex items-center gap-3 text-sm transition-colors',
      active ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'text-slate-600 hover:bg-white hover:text-slate-900',
    )}
    onClick={onClick}
  >
    <span className="text-slate-500">{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
)
