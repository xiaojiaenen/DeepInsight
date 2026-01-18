export type WorkspaceEntry = { name: string; path: string; kind: 'file' | 'dir' }

export type WorkspaceState = {
  root: string | null
  expanded: Record<string, boolean>
  entriesByDir: Record<string, WorkspaceEntry[]>
  loadingDirs: Record<string, boolean>
  activePath: string | null
  openFiles: Record<string, { content: string; dirty: boolean }>
  openPathList: string[]
  pythonEnv: { hasPyproject: boolean; hasRequirements: boolean; hasVenv: boolean; installer: 'uv-sync' | 'uv-pip' | 'none' } | null
  customPythonPath: string | null
  installStatus: { status: 'idle' | 'running' | 'done' | 'error'; message?: string } | null
  gitStatus: { branch: string; changes: number; files: Array<{ path: string; status: string }> } | null | undefined
  gitLoading: boolean
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

const STORAGE_KEY = 'deepinsight:workspace:v2'

type Listener = (s: WorkspaceState) => void

let state: WorkspaceState = {
  root: null,
  expanded: {},
  entriesByDir: {},
  loadingDirs: {},
  activePath: null,
  openFiles: {},
  openPathList: [],
  pythonEnv: null,
  customPythonPath: null,
  installStatus: null,
  gitStatus: undefined,
  gitLoading: false,
  saveStatus: 'idle',
}

const listeners = new Set<Listener>()

const persist = () => {
  try {
    const payload = { 
      root: state.root,
      openPathList: state.openPathList,
      activePath: state.activePath,
      customPythonPath: state.customPythonPath
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    void e
  }
}

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return
    const obj = parsed as Record<string, unknown>
    state = {
      ...state,
      root: typeof obj.root === 'string' ? obj.root : null,
      openPathList: Array.isArray(obj.openPathList) ? obj.openPathList : [],
      activePath: typeof obj.activePath === 'string' ? obj.activePath : null,
      customPythonPath: typeof obj.customPythonPath === 'string' ? obj.customPythonPath : null,
    }
    // We don't load contents here, they will be loaded when needed
  } catch (e) {
    void e
  }
}

load()

const notify = () => {
  persist()
  for (const l of listeners) l(state)
}

export function getWorkspaceState() {
  return state
}

export function subscribeWorkspace(listener: Listener) {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}

const api = () => window.workspace ?? null

export async function openWorkspaceFolder() {
  const w = api()
  if (!w) return
  const res = await w.openFolder()
  if (!res?.root) return
  state = {
    ...state,
    root: res.root,
    entriesByDir: {},
    expanded: { '': true },
    loadingDirs: {},
    activePath: null,
    openFiles: {},
    pythonEnv: null,
    installStatus: null,
  }
  notify()
  await refreshDir('')
  await detectPythonEnv()
  await refreshGitStatus()
}

export function closeWorkspaceFolder() {
  state = {
    ...state,
    root: null,
    entriesByDir: {},
    expanded: {},
    loadingDirs: {},
    activePath: null,
    openFiles: {},
    openPathList: [],
    pythonEnv: null,
    customPythonPath: null,
    installStatus: null,
    gitStatus: undefined,
  }
  notify()
}

export function setCustomPythonPath(path: string | null) {
  state = { ...state, customPythonPath: path }
  notify()
}

export async function refreshGitStatus() {
  const w = api()
  if (!w || !state.root) return
  try {
    const status = await w.gitStatus(state.root)
    state = { ...state, gitStatus: status }
    notify()
  } catch {
    state = { ...state, gitStatus: null }
    notify()
  }
}

export async function gitCommit(message: string, addAll = true) {
  const w = api()
  if (!w || !state.root) return
  state = { ...state, gitLoading: true }
  notify()
  try {
    const ok = await w.gitCommit(state.root, message, addAll)
    if (ok) await refreshGitStatus()
    return ok
  } finally {
    state = { ...state, gitLoading: false }
    notify()
  }
}

export async function gitAdd(path: string) {
  const w = api()
  if (!w || !state.root) return
  state = { ...state, gitLoading: true }
  notify()
  try {
    const ok = await w.gitAdd(state.root, path)
    if (ok) await refreshGitStatus()
    return ok
  } finally {
    state = { ...state, gitLoading: false }
    notify()
  }
}

export async function gitReset(path: string) {
  const w = api()
  if (!w || !state.root) return
  state = { ...state, gitLoading: true }
  notify()
  try {
    const ok = await w.gitReset(state.root, path)
    if (ok) await refreshGitStatus()
    return ok
  } finally {
    state = { ...state, gitLoading: false }
    notify()
  }
}

export async function gitPush() {
  const w = api()
  if (!w || !state.root) return
  state = { ...state, gitLoading: true }
  notify()
  try {
    const ok = await w.gitPush(state.root)
    if (ok) await refreshGitStatus()
    return ok
  } finally {
    state = { ...state, gitLoading: false }
    notify()
  }
}

export async function gitPull() {
  const w = api()
  if (!w || !state.root) return
  state = { ...state, gitLoading: true }
  notify()
  try {
    const ok = await w.gitPull(state.root)
    if (ok) await refreshGitStatus()
    return ok
  } finally {
    state = { ...state, gitLoading: false }
    notify()
  }
}

export async function getGitDiff(path: string) {
  const w = api()
  if (!w || !state.root) return ''
  try {
    return await w.gitDiff(state.root, path)
  } catch {
    return ''
  }
}

export async function refreshDir(dir: string) {
  const w = api()
  if (!w || !state.root) return
  const root = state.root
  state = { ...state, loadingDirs: { ...state.loadingDirs, [dir]: true } }
  notify()
  try {
    const entries = await w.list(root, dir)
    state = { ...state, entriesByDir: { ...state.entriesByDir, [dir]: entries } }
  } finally {
    state = { ...state, loadingDirs: { ...state.loadingDirs, [dir]: false } }
    notify()
  }
}

export async function detectPythonEnv() {
  const w = api()
  if (!w || !state.root) return
  const env = await w.detectPythonEnv(state.root)
  state = { ...state, pythonEnv: env }
  notify()
}

let unsubLog: (() => void) | null = null
let unsubStatus: (() => void) | null = null

export function subscribeInstallEvents(onLog: (line: string) => void) {
  const w = api()
  if (!w) return () => {}
  unsubLog?.()
  unsubStatus?.()
  unsubLog = w.onInstallLog(onLog)
  unsubStatus = w.onInstallStatus((s) => {
    state = { ...state, installStatus: s }
    notify()
    void detectPythonEnv()
  })
  return () => {
    unsubLog?.()
    unsubStatus?.()
    unsubLog = null
    unsubStatus = null
  }
}

export async function installPythonDeps() {
  const w = api()
  const root = state.root
  if (!w || !root) return false
  state = { ...state, installStatus: { status: 'running' } }
  notify()
  const ok = await w.installPythonDeps(root)
  await detectPythonEnv()
  return ok
}

export function toggleDir(dir: string) {
  const next = !(state.expanded[dir] ?? false)
  state = { ...state, expanded: { ...state.expanded, [dir]: next } }
  notify()
  if (next && !state.entriesByDir[dir]) {
    void refreshDir(dir)
  }
}

export async function openFile(path: string) {
  const w = api()
  if (!w || !state.root) return
  const root = state.root
  
  // Add to openPathList if not already there
  const nextOpenList = state.openPathList.includes(path) 
    ? state.openPathList 
    : [...state.openPathList, path]

  state = { 
    ...state, 
    activePath: path,
    openPathList: nextOpenList
  }
  notify()
  
  if (state.openFiles[path]) return
  try {
    const content = await w.readFile(root, path)
    state = { ...state, openFiles: { ...state.openFiles, [path]: { content, dirty: false } } }
    notify()
  } catch (e) {
    console.error('Failed to read file:', e)
    // Populate with empty content to avoid stuck in loading/blank state if desired,
    // or just leave it. But let's at least ensure we don't crash.
    state = { ...state, openFiles: { ...state.openFiles, [path]: { content: '', dirty: false } } }
    notify()
  }
}

export function closeFile(path: string) {
  const nextOpenList = state.openPathList.filter(p => p !== path)
  const nextOpenFiles = { ...state.openFiles }
  delete nextOpenFiles[path]
  
  let nextActive = state.activePath
  if (nextActive === path) {
    nextActive = nextOpenList.length > 0 ? nextOpenList[nextOpenList.length - 1] : null
  }
  
  state = {
    ...state,
    openPathList: nextOpenList,
    openFiles: nextOpenFiles,
    activePath: nextActive
  }
  notify()
}

let saveTimer: number | null = null

export function updateOpenFile(path: string, content: string) {
  const current = state.openFiles[path]
  if (!current) return
  state = { ...state, openFiles: { ...state.openFiles, [path]: { content, dirty: true } } }
  notify()

  if (saveTimer != null) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    saveTimer = null
    void saveFile(path)
  }, 450)
}

export async function saveFile(path: string) {
  const w = api()
  if (!w || !state.root) return
  const root = state.root
  const current = state.openFiles[path]
  if (!current || !current.dirty) return
  
  state = { ...state, saveStatus: 'saving' }
  notify()

  try {
    await w.writeFile(root, path, current.content)
    state = { 
      ...state, 
      openFiles: { ...state.openFiles, [path]: { content: current.content, dirty: false } },
      saveStatus: 'saved'
    }
    notify()
    
    // Auto reset to idle after 2 seconds
    setTimeout(() => {
      if (state.saveStatus === 'saved') {
        state = { ...state, saveStatus: 'idle' }
        notify()
      }
    }, 2000)
  } catch (e) {
    console.error('Failed to save file:', e)
    state = { ...state, saveStatus: 'error' }
    notify()
  }

  // Refresh git status after save to update markers
  void refreshGitStatus()
}

export async function createFile(path: string) {
  const w = api()
  if (!w || !state.root) return
  await w.createFile(state.root, path)
  const dir = path.split('/').slice(0, -1).join('/')
  await refreshDir(dir)
  await openFile(path)
  void refreshGitStatus()
}

export async function createFolder(path: string) {
  const w = api()
  if (!w || !state.root) return
  await w.mkdir(state.root, path)
  const dir = path.split('/').slice(0, -1).join('/')
  await refreshDir(dir)
  void refreshGitStatus()
}

export async function renamePath(from: string, to: string) {
  const w = api()
  if (!w || !state.root) return
  await w.rename(state.root, from, to)
  
  const nextOpenList = state.openPathList.map(p => p === from ? to : p)
  const nextOpenFiles = { ...state.openFiles }
  const moved = nextOpenFiles[from]
  if (moved) {
    delete nextOpenFiles[from]
    nextOpenFiles[to] = moved
  }

  state = {
    ...state,
    activePath: state.activePath === from ? to : state.activePath,
    openPathList: nextOpenList,
    openFiles: nextOpenFiles,
  }
  
  notify()
  await refreshDir(from.split('/').slice(0, -1).join('/'))
  await refreshDir(to.split('/').slice(0, -1).join('/'))
  void refreshGitStatus()
}

export async function deletePath(path: string) {
  const w = api()
  if (!w || !state.root) return
  await w.delete(state.root, path)
  
  const nextOpenList = state.openPathList.filter(p => p !== path)
  const nextOpenFiles = { ...state.openFiles }
  delete nextOpenFiles[path]

  let nextActive = state.activePath
  if (nextActive === path) {
    nextActive = nextOpenList.length > 0 ? nextOpenList[nextOpenList.length - 1] : null
  }

  state = {
    ...state,
    activePath: nextActive,
    openPathList: nextOpenList,
    openFiles: nextOpenFiles,
  }

  notify()
  const dir = path.split('/').slice(0, -1).join('/')
  await refreshDir(dir)
  void refreshGitStatus()
}
