import type { VisualState } from './visualTypes'

type Listener = (patch: Partial<VisualState>) => void

const listeners = new Set<Listener>()

export function publishVisualPatch(patch: Partial<VisualState>) {
  for (const l of listeners) l(patch)
}

export function subscribeVisualPatch(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
