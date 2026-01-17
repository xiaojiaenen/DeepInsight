import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

type LayoutProps = {
  children: React.ReactNode
  onRun?: () => void
}

export const MainLayout: React.FC<LayoutProps> = ({ children, onRun }) => {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col relative bg-white">
        <TopBar onRun={onRun} />
        <div className="flex-1 min-h-0 relative">{children}</div>
      </main>
    </div>
  )
}
