import { useEffect, useState } from 'react'
import { hideContextMenu, subscribeContextMenu, type ContextMenuItem, type ContextMenuState } from '../../features/contextMenu/contextMenuStore'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function ContextMenuHost() {
  const [state, setState] = useState<ContextMenuState>({ open: false })

  useEffect(() => subscribeContextMenu(setState), [])

  useEffect(() => {
    if (!state.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.open])

  if (!state.open) return null

  const width = 200
  const left = clamp(state.x, 8, window.innerWidth - width - 8)
  const top = clamp(state.y, 8, window.innerHeight - 240)

  return (
    <div className="fixed inset-0 z-[1000]" onMouseDown={() => hideContextMenu()}>
      <div
        className="absolute w-[200px] rounded border border-slate-200 bg-white shadow-lg p-1"
        style={{ left, top }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {state.items.map((it, idx) => (
          <MenuItem key={`${it.label}-${idx}`} item={it} />
        ))}
      </div>
    </div>
  )
}

function MenuItem({ item }: { item: ContextMenuItem }) {
  const cls = item.disabled
    ? 'text-slate-400'
    : item.danger
      ? 'text-red-700 hover:bg-red-50'
      : 'text-slate-800 hover:bg-slate-50'
  return (
    <button
      className={`w-full text-left text-xs px-2 py-1 rounded ${cls}`}
      disabled={item.disabled}
      onClick={() => {
        if (item.disabled) return
        hideContextMenu()
        item.onClick()
      }}
    >
      {item.label}
    </button>
  )
}
