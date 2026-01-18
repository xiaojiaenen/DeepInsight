import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
})

contextBridge.exposeInMainWorld('workspace', {
  openFolder: () => ipcRenderer.invoke('workspace:openFolder'),
  list: (root: string, dir: string) => ipcRenderer.invoke('workspace:list', { root, dir }),
  readFile: (root: string, filePath: string) => ipcRenderer.invoke('workspace:readFile', { root, path: filePath }),
  writeFile: (root: string, filePath: string, content: string) =>
    ipcRenderer.invoke('workspace:writeFile', { root, path: filePath, content }),
  createFile: (root: string, filePath: string) => ipcRenderer.invoke('workspace:createFile', { root, path: filePath }),
  mkdir: (root: string, dirPath: string) => ipcRenderer.invoke('workspace:mkdir', { root, path: dirPath }),
  rename: (root: string, from: string, to: string) => ipcRenderer.invoke('workspace:rename', { root, from, to }),
  delete: (root: string, targetPath: string) => ipcRenderer.invoke('workspace:delete', { root, path: targetPath }),
  detectPythonEnv: (root: string) => ipcRenderer.invoke('workspace:detectPythonEnv', { root }),
  installPythonDeps: (root: string) => ipcRenderer.invoke('workspace:installPythonDeps', { root }),
  onInstallLog: (listener: (line: string) => void) => {
    const onEvent = (_: unknown, line: string) => listener(line)
    ipcRenderer.on('workspace:installLog', onEvent)
    return () => ipcRenderer.off('workspace:installLog', onEvent)
  },
  onInstallStatus: (listener: (status: { status: 'idle' | 'running' | 'done' | 'error'; message?: string }) => void) => {
    const onEvent = (_: unknown, payload: { status: 'idle' | 'running' | 'done' | 'error'; message?: string }) => listener(payload)
    ipcRenderer.on('workspace:installStatus', onEvent)
    return () => ipcRenderer.off('workspace:installStatus', onEvent)
  },
  gitStatus: (root: string) => ipcRenderer.invoke('workspace:gitStatus', { root }),
  gitDiff: (root: string, filePath: string) => ipcRenderer.invoke('workspace:gitDiff', { root, path: filePath }),
  gitAdd: (root: string, filePath: string) => ipcRenderer.invoke('workspace:gitAdd', { root, path: filePath }),
  gitReset: (root: string, filePath: string) => ipcRenderer.invoke('workspace:gitReset', { root, path: filePath }),
  gitCommit: (root: string, message: string, addAll?: boolean) => ipcRenderer.invoke('workspace:gitCommit', { root, message, addAll }),
  gitPush: (root: string) => ipcRenderer.invoke('workspace:gitPush', { root }),
  gitPull: (root: string) => ipcRenderer.invoke('workspace:gitPull', { root }),
})

contextBridge.exposeInMainWorld('notes', {
  list: () => ipcRenderer.invoke('notes:list'),
  read: (id: string) => ipcRenderer.invoke('notes:read', id),
  write: (id: string, content: string) => ipcRenderer.invoke('notes:write', id, content),
  delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
  create: (name: string) => ipcRenderer.invoke('notes:create', name),
})
