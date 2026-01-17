import type { VisualAction } from './visualActions'

type Listener = (action: VisualAction) => void

const listeners = new Set<Listener>()

export function publishVisualAction(action: VisualAction) {
  for (const l of listeners) l(action)
}

export function subscribeVisualAction(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
