import type { VisualState } from './visualTypes'

export type VisualPatch = Partial<VisualState>

export type VisualAction =
  | { kind: 'patch'; patch: VisualPatch }
  | { kind: 'tween'; to: VisualPatch; durationMs: number }
  | { kind: 'reset' }

