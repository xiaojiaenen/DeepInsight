import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { subscribeVisualAction } from '../../features/visualization/visualBus'
import type { VisualAction, VisualPatch } from '../../features/visualization/visualActions'
import { defaultVisualState, type VisualState } from '../../features/visualization/visualTypes'

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const toVec3 = (v: unknown, fallback: [number, number, number]): [number, number, number] => {
  if (!Array.isArray(v) || v.length < 3) return fallback
  const x = v[0]
  const y = v[1]
  const z = v[2]
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return fallback
  return [x, y, z]
}

const toColor = (v: unknown, fallback: string): string => {
  return typeof v === 'string' ? v : fallback
}

const sanitizePatch = (patch: VisualPatch): VisualPatch => {
  const src = patch as Record<string, unknown>
  const next: VisualPatch = {}
  if ('cubeRotation' in src) next.cubeRotation = toVec3(src.cubeRotation, defaultVisualState.cubeRotation)
  if ('cubePosition' in src) next.cubePosition = toVec3(src.cubePosition, defaultVisualState.cubePosition)
  if ('cubeScale' in src) next.cubeScale = toVec3(src.cubeScale, defaultVisualState.cubeScale)
  if ('cubeColor' in src) next.cubeColor = toColor(src.cubeColor, defaultVisualState.cubeColor)
  return next
}

const mergeVisualState = (prev: VisualState, patch: VisualPatch): VisualState => {
  const p = sanitizePatch(patch)
  return {
    cubeRotation: p.cubeRotation ?? prev.cubeRotation,
    cubePosition: p.cubePosition ?? prev.cubePosition,
    cubeScale: p.cubeScale ?? prev.cubeScale,
    cubeColor: p.cubeColor ?? prev.cubeColor,
  }
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

const smoothstep = (t: number) => {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const lerpVec3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

const parseHex = (s: string): { r: number; g: number; b: number } | null => {
  const m = s.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!m) return null
  const hex = m[1]
  if (!hex) return null
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16)
    const g = parseInt(hex[1] + hex[1], 16)
    const b = parseInt(hex[2] + hex[2], 16)
    return { r, g, b }
  }
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return { r, g, b }
}

const toHex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')

const lerpColor = (a: string, b: string, t: number) => {
  const ca = parseHex(a)
  const cb = parseHex(b)
  if (!ca || !cb) return t < 0.5 ? a : b
  const r = lerp(ca.r, cb.r, t)
  const g = lerp(ca.g, cb.g, t)
  const bl = lerp(ca.b, cb.b, t)
  return `#${toHex2(r)}${toHex2(g)}${toHex2(bl)}`
}

const lerpVisualState = (a: VisualState, b: VisualState, t: number): VisualState => {
  return {
    cubeRotation: lerpVec3(a.cubeRotation, b.cubeRotation, t),
    cubePosition: lerpVec3(a.cubePosition, b.cubePosition, t),
    cubeScale: lerpVec3(a.cubeScale, b.cubeScale, t),
    cubeColor: lerpColor(a.cubeColor, b.cubeColor, t),
  }
}

export const VisualCanvas: React.FC = () => {
  const [state, setState] = useState<VisualState>(defaultVisualState)
  const dpr = useMemo(() => Math.min(2, window.devicePixelRatio || 1), [])
  const stateRef = useRef<VisualState>(defaultVisualState)
  const rafRef = useRef<number | null>(null)

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const applyAction = useCallback((action: VisualAction) => {
    if (action.kind === 'reset') {
      cancelRaf()
      stateRef.current = defaultVisualState
      setState(defaultVisualState)
      return
    }

    if (action.kind === 'patch') {
      cancelRaf()
      const next = mergeVisualState(stateRef.current, action.patch)
      stateRef.current = next
      setState(next)
      return
    }

    const from = stateRef.current
    const to = mergeVisualState(from, action.to)
    const durationMs = Math.max(0, action.durationMs)
    if (durationMs === 0) {
      cancelRaf()
      stateRef.current = to
      setState(to)
      return
    }

    cancelRaf()
    const start = performance.now()
    const tick = (now: number) => {
      const t = smoothstep((now - start) / durationMs)
      const next = lerpVisualState(from, to, t)
      stateRef.current = next
      setState(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [cancelRaf])

  useEffect(() => {
    return subscribeVisualAction((action) => {
      applyAction(action)
    })
  }, [applyAction])

  return (
    <Canvas
      className="w-full h-full"
      dpr={dpr}
      camera={{ position: [3, 3, 3], fov: 50 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.9} />
      <OrbitControls makeDefault />
      <Grid
        infiniteGrid
        fadeDistance={20}
        fadeStrength={1}
        sectionSize={1}
        cellSize={0.25}
        sectionColor="#cbd5e1"
        cellColor="#e2e8f0"
      />
      <mesh position={state.cubePosition} rotation={state.cubeRotation} scale={state.cubeScale}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={state.cubeColor} />
      </mesh>
    </Canvas>
  )
}
