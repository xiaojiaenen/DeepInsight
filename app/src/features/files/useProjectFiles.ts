import { useEffect, useMemo, useState } from 'react'
import type { ProjectFile, ProjectState } from './filesStore'
import { getProjectState, subscribeProject } from './filesStore'

export function useProjectFiles() {
  const [state, setState] = useState<ProjectState>(() => getProjectState())

  useEffect(() => {
    return subscribeProject(setState)
  }, [])

  const activeFile: ProjectFile | null = useMemo(() => {
    return state.files.find((f) => f.id === state.activeFileId) ?? state.files[0] ?? null
  }, [state.activeFileId, state.files])

  return { state, activeFile }
}

