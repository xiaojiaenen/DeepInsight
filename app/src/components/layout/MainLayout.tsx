import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

type LayoutProps = {
  children: React.ReactNode
  isRunning?: boolean
  onRun?: () => void
  onStop?: () => void
}

export const MainLayout: React.FC<LayoutProps> = ({ children, isRunning, onRun, onStop }) => {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col relative bg-white">
        <TopBar isRunning={isRunning} onRun={onRun} onStop={onStop} />
        <div className="flex-1 min-h-0 relative">{children}</div>
      </main>
    </div>
  )
}
