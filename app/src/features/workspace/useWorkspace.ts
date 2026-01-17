import { useEffect, useMemo, useState } from 'react'
import { getWorkspaceState, subscribeWorkspace, type WorkspaceState } from './workspaceStore'
import { detectPythonEnv, refreshDir } from './workspaceStore'

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(() => getWorkspaceState())
  useEffect(() => subscribeWorkspace(setState), [])
  useEffect(() => {
    if (!state.root) return
    if (!state.entriesByDir['']) void refreshDir('')
    if (!state.pythonEnv) void detectPythonEnv()
  }, [state.root, state.entriesByDir, state.pythonEnv])

  const activeContent = useMemo(() => {
    const p = state.activePath
    if (!p) return null
    return state.openFiles[p]?.content ?? null
  }, [state.activePath, state.openFiles])

  return { state, activeContent }
}
