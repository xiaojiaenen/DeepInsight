import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'

type Matrix2x2 = [[number, number], [number, number]]

type MatrixVisualizerProps = {
  matrix: Matrix2x2
}

const Arrow: React.FC<{ v: THREE.Vector3; color: string }> = ({ v, color }) => {
  const ref = useRef<THREE.ArrowHelper | null>(null)
  const obj = useMemo(() => {
    const dir = new THREE.Vector3(1, 0, 0)
    const origin = new THREE.Vector3(0, 0, 0)
    const arrow = new THREE.ArrowHelper(dir, origin, 1, color)
    ref.current = arrow
    return arrow
  }, [color])

  useEffect(() => {
    const arrow = ref.current
    if (!arrow) return
    const len = v.length()
    const dir = len > 1e-6 ? v.clone().normalize() : new THREE.Vector3(1, 0, 0)
    arrow.setDirection(dir)
    arrow.setLength(Math.max(0.001, len), 0.12, 0.08)
  }, [v])

  return <primitive object={obj} />
}

export const MatrixVisualizer: React.FC<MatrixVisualizerProps> = ({ matrix }) => {
  const a = matrix[0][0]
  const b = matrix[0][1]
  const c = matrix[1][0]
  const d = matrix[1][1]

  const iVec = useMemo(() => new THREE.Vector3(a, 0, c), [a, c])
  const jVec = useMemo(() => new THREE.Vector3(b, 0, d), [b, d])
  const sumVec = useMemo(() => iVec.clone().add(jVec), [iVec, jVec])

  const frameGeom = useMemo(() => {
    const pts = [
      new THREE.Vector3(0, 0, 0),
      iVec.clone(),
      new THREE.Vector3(0, 0, 0),
      jVec.clone(),
      iVec.clone(),
      sumVec.clone(),
      jVec.clone(),
      sumVec.clone(),
    ]
    const g = new THREE.BufferGeometry().setFromPoints(pts)
    return g
  }, [iVec, jVec, sumVec])

  const frameMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.8,
      }),
    [],
  )

  return (
    <group>
      <lineSegments geometry={frameGeom} material={frameMat} />
      <Arrow v={iVec} color="#ef4444" />
      <Arrow v={jVec} color="#22c55e" />

      <Html position={[0, 0.01, 0]} center>
        <div className="pointer-events-none text-xs text-slate-700 bg-white/90 backdrop-blur px-2 py-1 rounded border border-slate-200 tabular-nums">
          [{a.toFixed(2)} {b.toFixed(2)}; {c.toFixed(2)} {d.toFixed(2)}]
        </div>
      </Html>
    </group>
  )
}

