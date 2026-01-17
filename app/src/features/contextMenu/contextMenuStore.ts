export type ContextMenuItem = {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

export type ContextMenuState =
  | { open: false }
  | { open: true; x: number; y: number; items: ContextMenuItem[] }

type Listener = (s: ContextMenuState) => void

let state: ContextMenuState = { open: false }
const listeners = new Set<Listener>()

const notify = () => {
  for (const l of listeners) l(state)
}

export function subscribeContextMenu(listener: Listener) {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}

export function showContextMenu(x: number, y: number, items: ContextMenuItem[]) {
  state = { open: true, x, y, items }
  notify()
}

export function hideContextMenu() {
  if (!state.open) return
  state = { open: false }
  notify()
}

