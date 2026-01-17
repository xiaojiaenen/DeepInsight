import type { VisualAction, VisualPatch } from './visualActions'

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

export function coerceVisualAction(payload: unknown): VisualAction | null {
  if (!isObject(payload)) return null

  const kind = payload.kind
  if (kind === 'reset') return { kind: 'reset' }

  if (kind === 'tween') {
    const to = payload.to
    const durationMs = payload.durationMs
    if (!isObject(to)) return null
    const duration = typeof durationMs === 'number' && Number.isFinite(durationMs) ? durationMs : 300
    return { kind: 'tween', to: to as VisualPatch, durationMs: Math.max(0, duration) }
  }

  if (kind === 'patch') {
    const patch = payload.patch
    if (!isObject(patch)) return null
    return { kind: 'patch', patch: patch as VisualPatch }
  }

  if (kind === undefined) {
    return { kind: 'patch', patch: payload as VisualPatch }
  }

  return null
}

