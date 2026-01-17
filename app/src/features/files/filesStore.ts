export type ProjectFile = {
  id: string
  path: string
  language: 'python'
  content: string
}

export type ProjectState = {
  files: ProjectFile[]
  activeFileId: string
}

const STORAGE_KEY = 'deepinsight:projectFiles:v1'

type Listener = (state: ProjectState) => void

const makeId = () => `f_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`

const normalizePath = (input: string) => {
  const raw = input.trim().replace(/\\/g, '/')
  const noLead = raw.replace(/^\/+/, '')
  const parts = noLead.split('/').filter(Boolean)
  if (!parts.length) return 'untitled.py'
  const last = parts[parts.length - 1] ?? 'untitled.py'
  const file = last.endsWith('.py') ? last : `${last}.py`
  return [...parts.slice(0, -1), file].join('/')
}

const ensureUniquePath = (path: string, existing: Set<string>) => {
  if (!existing.has(path)) return path
  const segs = path.split('/')
  const file = segs.pop() ?? path
  const dot = file.lastIndexOf('.')
  const stem = dot >= 0 ? file.slice(0, dot) : file
  const ext = dot >= 0 ? file.slice(dot) : ''
  for (let i = 2; i < 1000; i++) {
    const candidate = [...segs, `${stem}_${i}${ext}`].join('/')
    if (!existing.has(candidate)) return candidate
  }
  return path
}

const defaultMain: ProjectFile = {
  id: 'main',
  path: 'main.py',
  language: 'python',
  content:
    '# 在此编写 Python 代码\n# 指标（MLOps 风格）：print(\'__METRIC__ : {"name":"loss","value":0.42,"step":1}\')\n\nimport numpy as np\n\nprint("你好，DeepInsight")\n',
}

let state: ProjectState = {
  files: [defaultMain],
  activeFileId: defaultMain.id,
}

const listeners = new Set<Listener>()

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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
    const filesRaw = obj.files
    const activeRaw = obj.activeFileId
    if (!Array.isArray(filesRaw) || typeof activeRaw !== 'string') return
    const files: ProjectFile[] = filesRaw
      .map((f) => {
        if (!f || typeof f !== 'object') return null
        const r = f as Record<string, unknown>
        const id = typeof r.id === 'string' ? r.id : null
        const path = typeof r.path === 'string' ? r.path : typeof r.name === 'string' ? r.name : null
        const content = typeof r.content === 'string' ? r.content : ''
        if (!id || !path) return null
        return { id, path: normalizePath(path), language: 'python', content }
      })
      .filter((x): x is ProjectFile => x != null)
    if (!files.length) return
    const activeFileId = files.some((f) => f.id === activeRaw) ? activeRaw : files[0]!.id
    state = { files, activeFileId }
  } catch (e) {
    void e
  }
}

load()

const notify = () => {
  persist()
  for (const l of listeners) l(state)
}

export function getProjectState(): ProjectState {
  return state
}

export function subscribeProject(listener: Listener) {
  listeners.add(listener)
  listener(state)
  return () => {
    listeners.delete(listener)
  }
}

export function setActiveFile(id: string) {
  if (!state.files.some((f) => f.id === id)) return
  state = { ...state, activeFileId: id }
  notify()
}

export function setActiveFileByPath(path: string) {
  const p = normalizePath(path)
  const f = state.files.find((x) => x.path === p)
  if (!f) return
  state = { ...state, activeFileId: f.id }
  notify()
}

export function updateFileContent(id: string, content: string) {
  const next = state.files.map((f) => (f.id === id ? { ...f, content } : f))
  state = { ...state, files: next }
  notify()
}

export function addFile(name: string) {
  const existing = new Set(state.files.map((f) => f.path))
  const finalName = ensureUniquePath(normalizePath(name), existing)
  const id = makeId()
  const file: ProjectFile = { id, path: finalName, language: 'python', content: '' }
  state = { ...state, files: [file, ...state.files], activeFileId: id }
  notify()
}

export function renameFile(id: string, nextName: string) {
  const name = nextName.trim()
  if (!name) return
  const existing = new Set(state.files.filter((f) => f.id !== id).map((f) => f.path))
  const finalName = ensureUniquePath(normalizePath(name), existing)
  state = { ...state, files: state.files.map((f) => (f.id === id ? { ...f, path: finalName } : f)) }
  notify()
}

export function deleteFile(id: string) {
  if (state.files.length <= 1) return
  const nextFiles = state.files.filter((f) => f.id !== id)
  if (nextFiles.length === state.files.length) return
  const nextActive = state.activeFileId === id ? nextFiles[0]!.id : state.activeFileId
  state = { files: nextFiles, activeFileId: nextActive }
  notify()
}
