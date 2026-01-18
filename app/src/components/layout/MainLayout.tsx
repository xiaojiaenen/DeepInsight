import React from 'react'
import { Sidebar } from './Sidebar'
import type { MainTab } from './Sidebar'
import { TopBar } from './TopBar'
import { ContextMenuHost } from '../context/ContextMenuHost'
import { GlobalStatusBar } from './GlobalStatusBar'

type LayoutProps = {
  children: React.ReactNode
  activeTab: MainTab
  onTabChange: (tab: MainTab) => void
  isRunning?: boolean
  onRun?: () => void
  onStop?: () => void
}

export const MainLayout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, isRunning, onRun, onStop }) => {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans flex-col">
      <div className="flex flex-1 min-h-0">
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
        <main className="flex-1 min-w-0 flex flex-col relative bg-white">
          <TopBar isRunning={isRunning} onRun={onRun} onStop={onStop} />
          <div className="flex-1 min-h-0 relative flex flex-col">{children}</div>
          <ContextMenuHost />
        </main>
      </div>
      <GlobalStatusBar />
    </div>
  )
}
