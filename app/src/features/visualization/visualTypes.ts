export type VisualState = {
  cubeRotation: [number, number, number]
  cubePosition: [number, number, number]
  cubeScale: [number, number, number]
  cubeColor: string
}

export const defaultVisualState: VisualState = {
  cubeRotation: [0, 0, 0],
  cubePosition: [0, 0.5, 0],
  cubeScale: [1, 1, 1],
  cubeColor: '#3b82f6',
}

