import React from 'react'
import { Minus, Square, X } from 'lucide-react'

export const WindowControls: React.FC = () => {
  const api = window.windowControls

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
  )
}

