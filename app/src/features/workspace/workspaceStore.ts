export type WorkspaceEntry = { name: string; path: string; kind: 'file' | 'dir' }

export type WorkspaceState = {
  root: string | null
  expanded: Record<string, boolean>
  entriesByDir: Record<string, WorkspaceEntry[]>
  loadingDirs: Record<string, boolean>
  activePath: string | null
  openFiles: Record<string, { content: string; dirty: boolean }>
  pythonEnv: { hasPyproject: boolean; hasRequirements: boolean; hasVenv: boolean; installer: 'uv-sync' | 'uv-pip' | 'none' } | null
  installStatus: { status: 'idle' | 'running' | 'done' | 'error'; message?: string } | null
}

const STORAGE_KEY = 'deepinsight:workspace:v1'

type Listener = (s: WorkspaceState) => void

let state: WorkspaceState = {
  root: null,
  expanded: {},
  entriesByDir: {},
  loadingDirs: {},
  activePath: null,
  openFiles: {},
  pythonEnv: null,
  installStatus: null,
}

const listeners = new Set<Listener>()

const persist = () => {
  try {
    const payload = { root: state.root }
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
    }
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
  state = { ...state, activePath: path }
  notify()
  if (state.openFiles[path]) return
  const content = await w.readFile(root, path)
  state = { ...state, openFiles: { ...state.openFiles, [path]: { content, dirty: false } } }
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
  await w.writeFile(root, path, current.content)
  state = { ...state, openFiles: { ...state.openFiles, [path]: { content: current.content, dirty: false } } }
  notify()
}

export async function createFile(path: string) {
  const w = api()
  if (!w || !state.root) return
  await w.createFile(state.root, path)
  const dir = path.split('/').slice(0, -1).join('/')
  await refreshDir(dir)
  await openFile(path)
}

export async function createFolder(path: string) {
  const w = api()
  if (!w || !state.root) return
  await w.mkdir(state.root, path)
  const dir = path.split('/').slice(0, -1).join('/')
  await refreshDir(dir)
}

export async function renamePath(from: string, to: string) {
  const w = api()
  if (!w || !state.root) return
  await w.rename(state.root, from, to)
  state = {
    ...state,
    activePath: state.activePath === from ? to : state.activePath,
  }
  const moved = state.openFiles[from]
  if (moved) {
    const next = { ...state.openFiles }
    delete next[from]
    next[to] = moved
    state = { ...state, openFiles: next }
  }
  notify()
  await refreshDir(from.split('/').slice(0, -1).join('/'))
  await refreshDir(to.split('/').slice(0, -1).join('/'))
}

export async function deletePath(path: string) {
  const w = api()
  if (!w || !state.root) return
  await w.delete(state.root, path)
  const dir = path.split('/').slice(0, -1).join('/')
  if (state.activePath === path) state = { ...state, activePath: null }
  const next = { ...state.openFiles }
  delete next[path]
  state = { ...state, openFiles: next }
  notify()
  await refreshDir(dir)
}
