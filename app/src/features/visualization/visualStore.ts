import type { VisualAction, VisualPatch } from './visualActions'
import { defaultVisualState, type VisualState } from './visualTypes'

type StateListener = (state: VisualState) => void

let currentState: VisualState = defaultVisualState
const listeners = new Set<StateListener>()

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const toVec3 = (v: unknown, fallback: [number, number, number]): [number, number, number] => {
  if (!Array.isArray(v) || v.length < 3) return fallback
  const x = v[0]
  const y = v[1]
  const z = v[2]
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return fallback
  return [x, y, z]
}

const toColor = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback)

const toMode = (v: unknown, fallback: VisualState['mode']): VisualState['mode'] => {
  if (v === 'cube' || v === 'matrix') return v
  return fallback
}

const toMatrix2x2 = (v: unknown, fallback: VisualState['matrix2x2']): VisualState['matrix2x2'] => {
  if (!Array.isArray(v) || v.length < 2) return fallback
  const r0 = v[0]
  const r1 = v[1]
  if (!Array.isArray(r0) || !Array.isArray(r1) || r0.length < 2 || r1.length < 2) return fallback
  const a = r0[0]
  const b = r0[1]
  const c = r1[0]
  const d = r1[1]
  if (!isFiniteNumber(a) || !isFiniteNumber(b) || !isFiniteNumber(c) || !isFiniteNumber(d)) return fallback
  return [
    [a, b],
    [c, d],
  ]
}

const sanitizePatch = (patch: VisualPatch): VisualPatch => {
  const src = patch as Record<string, unknown>
  const next: VisualPatch = {}
  if ('mode' in src) next.mode = toMode(src.mode, currentState.mode)
  if ('cubeRotation' in src) next.cubeRotation = toVec3(src.cubeRotation, currentState.cubeRotation)
  if ('cubePosition' in src) next.cubePosition = toVec3(src.cubePosition, currentState.cubePosition)
  if ('cubeScale' in src) next.cubeScale = toVec3(src.cubeScale, currentState.cubeScale)
  if ('cubeColor' in src) next.cubeColor = toColor(src.cubeColor, currentState.cubeColor)
  if ('matrix2x2' in src) next.matrix2x2 = toMatrix2x2(src.matrix2x2, currentState.matrix2x2)
  return next
}

const mergeState = (prev: VisualState, patch: VisualPatch): VisualState => {
  const p = sanitizePatch(patch)
  return {
    mode: p.mode ?? prev.mode,
    cubeRotation: p.cubeRotation ?? prev.cubeRotation,
    cubePosition: p.cubePosition ?? prev.cubePosition,
    cubeScale: p.cubeScale ?? prev.cubeScale,
    cubeColor: p.cubeColor ?? prev.cubeColor,
    matrix2x2: p.matrix2x2 ?? prev.matrix2x2,
  }
}

export function applyVisualActionToState(prev: VisualState, action: VisualAction): VisualState {
  if (action.kind === 'reset') return defaultVisualState
  if (action.kind === 'patch') return mergeState(prev, action.patch)
  return mergeState(prev, action.to)
}

export function getVisualState(): VisualState {
  return currentState
}

export function subscribeVisualState(listener: StateListener) {
  listeners.add(listener)
  listener(currentState)
  return () => {
    listeners.delete(listener)
  }
}

export function updateVisualStateFromAction(action: VisualAction) {
  currentState = applyVisualActionToState(currentState, action)
  for (const l of listeners) l(currentState)
}

