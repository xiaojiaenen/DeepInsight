export type VisualMode = 'cube' | 'matrix'

export type VisualState = {
  mode: VisualMode
  cubeRotation: [number, number, number]
  cubePosition: [number, number, number]
  cubeScale: [number, number, number]
  cubeColor: string
  matrix2x2: [[number, number], [number, number]]
}

export const defaultVisualState: VisualState = {
  mode: 'cube',
  cubeRotation: [0, 0, 0],
  cubePosition: [0, 0.5, 0],
  cubeScale: [1, 1, 1],
  cubeColor: '#3b82f6',
  matrix2x2: [
    [1, 0],
    [0, 1],
  ],
}
