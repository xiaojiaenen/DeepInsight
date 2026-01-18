import { useEffect, useState, useRef } from 'react'
import { hideContextMenu, subscribeContextMenu, type ContextMenuItem, type ContextMenuState } from '../../features/contextMenu/contextMenuStore'
import { ChevronRight } from 'lucide-react'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function ContextMenuHost() {
  const [state, setState] = useState<ContextMenuState>({ open: false })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => subscribeContextMenu((s) => {
    setState(s)
    setHoveredIndex(null)
  }), [])

  useEffect(() => {
    if (!state.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.open])

  if (!state.open) return null

  const width = 180
  const height = state.items.length * 30 + 10 // rough estimate
  const left = clamp(state.x, 8, window.innerWidth - width - 8)
  const top = clamp(state.y, 8, window.innerHeight - height - 8)

  return (
    <div className="fixed inset-0 z-[1000]" onMouseDown={() => hideContextMenu()} onContextMenu={(e) => { e.preventDefault(); hideContextMenu(); }}>
      <div
        className="absolute w-[180px] rounded-lg border border-slate-200 bg-white/95 backdrop-blur-md shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100"
        style={{ left, top }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {state.items.map((it, idx) => {
          if ('type' in it && it.type === 'separator') {
            return <div key={idx} className="h-px bg-slate-100 my-1 mx-1" />
          }
          return (
            <MenuItem 
              key={idx} 
              item={it as ContextMenuItem} 
              isHovered={hoveredIndex === idx}
              onHover={() => setHoveredIndex(idx)}
            />
          )
        })}
      </div>
    </div>
  )
}

function MenuItem({ item, isHovered, onHover }: { item: ContextMenuItem; isHovered: boolean; onHover: () => void }) {
  if ('type' in item) return null

  const hasSubmenu = !!item.submenu && item.submenu.length > 0
  
  const cls = item.disabled
    ? 'text-slate-400 cursor-not-allowed'
    : item.danger
      ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'

  return (
    <div className="relative" onMouseEnter={onHover}>
      <button
        className={`w-full text-left text-[11px] px-2 py-1.5 rounded-md transition-all flex items-center gap-2 font-medium group ${cls} ${isHovered ? 'bg-emerald-50 text-emerald-700' : ''}`}
        disabled={item.disabled}
        onClick={() => {
          if (item.disabled || hasSubmenu) return
          hideContextMenu()
          item.onClick?.()
        }}
      >
        {item.icon && <span className="shrink-0 opacity-70 group-hover:opacity-100 w-4 flex justify-center">{item.icon}</span>}
        {!item.icon && <span className="w-4" />}
        <span className="flex-1 truncate">{item.label}</span>
        {item.shortcut && (
          <span className="ml-auto text-[9px] text-slate-400 font-normal tracking-tighter uppercase">{item.shortcut}</span>
        )}
        {hasSubmenu && (
          <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
        )}
      </button>

      {hasSubmenu && isHovered && (
        <div 
          className="absolute left-[100%] top-0 ml-1 w-[160px] rounded-lg border border-slate-200 bg-white shadow-xl p-1 animate-in fade-in slide-in-from-left-1 duration-100"
        >
          {item.submenu!.map((sub, idx) => {
            if ('type' in sub && sub.type === 'separator') {
              return <div key={idx} className="h-px bg-slate-100 my-1 mx-1" />
            }
            return (
              <button
                key={idx}
                className="w-full text-left text-[11px] px-2 py-1.5 rounded-md hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-all flex items-center gap-2 font-medium"
                onClick={(e) => {
                  e.stopPropagation()
                  hideContextMenu()
                  sub.onClick?.()
                }}
              >
                {sub.icon && <span className="shrink-0 opacity-70 w-4 flex justify-center">{sub.icon}</span>}
                {!sub.icon && <span className="w-4" />}
                <span className="flex-1 truncate">{sub.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
