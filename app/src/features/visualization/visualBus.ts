import type { VisualAction } from './visualActions'
import { updateVisualStateFromAction } from './visualStore'

type Listener = (action: VisualAction) => void

const listeners = new Set<Listener>()

export function publishVisualAction(action: VisualAction) {
  updateVisualStateFromAction(action)
  for (const l of listeners) l(action)
}

export function subscribeVisualAction(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
