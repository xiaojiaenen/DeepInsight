import React, { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { subscribeVisualPatch } from '../../features/visualization/visualBus'
import { defaultVisualState, type VisualState } from '../../features/visualization/visualTypes'

const mergeVisualState = (prev: VisualState, patch: Partial<VisualState>): VisualState => {
  return {
    cubeRotation: patch.cubeRotation ?? prev.cubeRotation,
    cubePosition: patch.cubePosition ?? prev.cubePosition,
    cubeScale: patch.cubeScale ?? prev.cubeScale,
    cubeColor: patch.cubeColor ?? prev.cubeColor,
  }
}

export const VisualCanvas: React.FC = () => {
  const [state, setState] = useState<VisualState>(defaultVisualState)
  const dpr = useMemo(() => Math.min(2, window.devicePixelRatio || 1), [])

  useEffect(() => {
    return subscribeVisualPatch((patch) => {
      setState((prev) => mergeVisualState(prev, patch))
    })
  }, [])

  return (
    <Canvas
      className="w-full h-full"
      dpr={dpr}
      camera={{ position: [3, 3, 3], fov: 50 }}
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

