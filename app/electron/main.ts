import { Menu, app, BrowserWindow, dialog, ipcMain } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { promises as fsp } from 'node:fs'

const DIST = path.join(__dirname, '../dist')

let win: BrowserWindow | null
let kernelProc: ChildProcessWithoutNullStreams | null = null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function getKernelDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'kernel')
  }
  return path.join(__dirname, '..', '..', 'kernel')
}

function spawnLogged(cmd: string, args: string[], cwd: string) {
  const p = spawn(cmd, args, { cwd, windowsHide: true })
  p.stdout.on('data', (d) => {
    const s = String(d)
    process.stdout.write(s)
  })
  p.stderr.on('data', (d) => {
    const s = String(d)
    process.stderr.write(s)
  })
  return p
}

async function runOnce(cmd: string, args: string[], cwd: string) {
  return await new Promise<void>((resolve, reject) => {
    const p = spawnLogged(cmd, args, cwd)
    p.on('error', reject)
    p.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

async function ensureKernelEnv() {
  const kernelDir = getKernelDir()
  const venvDir = path.join(kernelDir, '.venv')
  if (!fs.existsSync(venvDir)) {
    const desired = process.env.DEEPINSIGHT_PYTHON ?? '3.12'
    try {
      await runOnce('uv', ['python', 'install', desired], kernelDir)
    } catch (e) {
      console.warn('[kernel] uv python install failed', e)
    }
    try {
      await runOnce('uv', ['venv', '--python', desired], kernelDir)
    } catch {
      await runOnce('uv', ['venv'], kernelDir)
    }
  }
  await runOnce('uv', ['pip', 'install', '-r', 'requirements.txt'], kernelDir)
}

async function startKernel() {
  if (kernelProc) return
  const kernelDir = getKernelDir()
  const alreadyRunning = await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 8000 })
    const done = (v: boolean) => {
      try {
        socket.destroy()
      } catch (e) {
        void e
      }
      resolve(v)
    }
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
    socket.setTimeout(300, () => done(false))
  })
  if (alreadyRunning) return
  await ensureKernelEnv()
  kernelProc = spawnLogged('uv', ['run', 'main.py'], kernelDir)
  kernelProc.on('exit', () => {
    kernelProc = null
  })
}

function stopKernel() {
  if (!kernelProc) return
  try {
    kernelProc.kill()
  } catch (e) {
    void e
  }
  kernelProc = null
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(DIST, 'index.html'))
  }
}

function installAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

ipcMain.handle('window:minimize', (event) => {
  const w = BrowserWindow.fromWebContents(event.sender)
  w?.minimize()
})

ipcMain.handle('window:toggleMaximize', (event) => {
  const w = BrowserWindow.fromWebContents(event.sender)
  if (!w) return
  if (w.isMaximized()) w.unmaximize()
  else w.maximize()
})

ipcMain.handle('window:close', (event) => {
  const w = BrowserWindow.fromWebContents(event.sender)
  w?.close()
})

ipcMain.handle('window:isMaximized', (event) => {
  const w = BrowserWindow.fromWebContents(event.sender)
  return w?.isMaximized() ?? false
})

type WorkspaceEntry = { name: string; path: string; kind: 'file' | 'dir' }

function resolveInsideRoot(root: string, rel: string) {
  const rootAbs = path.resolve(root)
  const targetAbs = path.resolve(rootAbs, rel)
  const rootWithSep = rootAbs.endsWith(path.sep) ? rootAbs : rootAbs + path.sep
  if (targetAbs !== rootAbs && !targetAbs.startsWith(rootWithSep)) {
    throw new Error('Path is outside workspace')
  }
  return targetAbs
}

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.venv', '__pycache__', 'dist', 'build'])
let workspaceInstallRunning = false

function emitWorkspaceInstallStatus(status: 'idle' | 'running' | 'done' | 'error', message?: string) {
  if (!win) return
  win.webContents.send('workspace:installStatus', { status, message })
}

function emitWorkspaceInstallLog(line: string) {
  if (!win) return
  win.webContents.send('workspace:installLog', line)
}

async function fileExists(p: string) {
  try {
    await fsp.stat(p)
    return true
  } catch {
    return false
  }
}

ipcMain.handle('workspace:detectPythonEnv', async (_event, payload: { root: string }) => {
  const root = String(payload?.root ?? '')
  const rootAbs = path.resolve(root)
  const pyproject = path.join(rootAbs, 'pyproject.toml')
  const requirements = path.join(rootAbs, 'requirements.txt')
  const hasPyproject = await fileExists(pyproject)
  const hasRequirements = await fileExists(requirements)
  const hasVenv = await fileExists(path.join(rootAbs, '.venv'))
  const installer: 'uv-sync' | 'uv-pip' | 'none' = hasPyproject ? 'uv-sync' : hasRequirements ? 'uv-pip' : 'none'
  return { hasPyproject, hasRequirements, hasVenv, installer }
})

function spawnWithLog(cmd: string, args: string[], cwd: string) {
  const p = spawn(cmd, args, { cwd, windowsHide: true })
  p.stdout.on('data', (d) => {
    for (const line of String(d).split(/\r?\n/)) {
      if (line.trim().length) emitWorkspaceInstallLog(line)
    }
  })
  p.stderr.on('data', (d) => {
    for (const line of String(d).split(/\r?\n/)) {
      if (line.trim().length) emitWorkspaceInstallLog(line)
    }
  })
  return p
}

async function runWorkspaceInstall(rootAbs: string) {
  const hasPyproject = await fileExists(path.join(rootAbs, 'pyproject.toml'))
  const hasRequirements = await fileExists(path.join(rootAbs, 'requirements.txt'))

  if (!hasPyproject && !hasRequirements) {
    throw new Error('未检测到 pyproject.toml 或 requirements.txt')
  }

  emitWorkspaceInstallLog(`workspace: ${rootAbs}`)
  emitWorkspaceInstallLog('开始安装依赖（uv）...')

  if (!(await fileExists(path.join(rootAbs, '.venv')))) {
    emitWorkspaceInstallLog('创建虚拟环境：uv venv')
    await new Promise<void>((resolve, reject) => {
      const p = spawnWithLog('uv', ['venv'], rootAbs)
      p.on('error', reject)
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`uv venv exited with code ${code}`))))
    })
  }

  if (hasPyproject) {
    emitWorkspaceInstallLog('同步依赖：uv sync')
    await new Promise<void>((resolve, reject) => {
      const p = spawnWithLog('uv', ['sync'], rootAbs)
      p.on('error', reject)
      p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`uv sync exited with code ${code}`))))
    })
    return
  }

  emitWorkspaceInstallLog('安装依赖：uv pip install -r requirements.txt')
  await new Promise<void>((resolve, reject) => {
    const p = spawnWithLog('uv', ['pip', 'install', '-r', 'requirements.txt'], rootAbs)
    p.on('error', reject)
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`uv pip install exited with code ${code}`))))
  })
}

ipcMain.handle('workspace:installPythonDeps', async (_event, payload: { root: string }) => {
  const root = String(payload?.root ?? '')
  const rootAbs = path.resolve(root)
  if (workspaceInstallRunning) {
    emitWorkspaceInstallStatus('error', '已有安装任务在运行')
    return false
  }
  emitWorkspaceInstallStatus('running')
  workspaceInstallRunning = true
  try {
    await runWorkspaceInstall(rootAbs)
    emitWorkspaceInstallStatus('done')
    return true
  } catch (e) {
    emitWorkspaceInstallStatus('error', e instanceof Error ? e.message : String(e))
    return false
  } finally {
    workspaceInstallRunning = false
  }
})

ipcMain.handle('workspace:openFolder', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  })
  if (res.canceled) return null
  const root = res.filePaths[0]
  if (!root) return null
  return { root }
})

ipcMain.handle('workspace:list', async (_event, payload: { root: string; dir: string }) => {
  const root = String(payload?.root ?? '')
  const dir = String(payload?.dir ?? '')
  const abs = resolveInsideRoot(root, dir || '.')
  const entries = await fsp.readdir(abs, { withFileTypes: true })
  const out: WorkspaceEntry[] = []
  for (const e of entries) {
    if (e.name.startsWith('.')) {
      if (IGNORED_DIRS.has(e.name)) continue
    }
    const kind: 'file' | 'dir' = e.isDirectory() ? 'dir' : 'file'
    const p = dir ? path.posix.join(dir.replace(/\\/g, '/'), e.name) : e.name
    out.push({ name: e.name, path: p, kind })
  }
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return out
})

ipcMain.handle('workspace:readFile', async (_event, payload: { root: string; path: string }) => {
  const root = String(payload?.root ?? '')
  const rel = String(payload?.path ?? '')
  const abs = resolveInsideRoot(root, rel)
  return await fsp.readFile(abs, 'utf-8')
})

ipcMain.handle('workspace:writeFile', async (_event, payload: { root: string; path: string; content: string }) => {
  const root = String(payload?.root ?? '')
  const rel = String(payload?.path ?? '')
  const content = String(payload?.content ?? '')
  const abs = resolveInsideRoot(root, rel)
  await fsp.mkdir(path.dirname(abs), { recursive: true })
  await fsp.writeFile(abs, content, 'utf-8')
  return true
})

ipcMain.handle('workspace:createFile', async (_event, payload: { root: string; path: string }) => {
  const root = String(payload?.root ?? '')
  const rel = String(payload?.path ?? '')
  const abs = resolveInsideRoot(root, rel)
  await fsp.mkdir(path.dirname(abs), { recursive: true })
  await fsp.writeFile(abs, '', { encoding: 'utf-8', flag: 'wx' }).catch(async () => {
    await fsp.writeFile(abs, '', { encoding: 'utf-8' })
  })
  return true
})

ipcMain.handle('workspace:mkdir', async (_event, payload: { root: string; path: string }) => {
  const root = String(payload?.root ?? '')
  const rel = String(payload?.path ?? '')
  const abs = resolveInsideRoot(root, rel)
  await fsp.mkdir(abs, { recursive: true })
  return true
})

ipcMain.handle('workspace:rename', async (_event, payload: { root: string; from: string; to: string }) => {
  const root = String(payload?.root ?? '')
  const from = String(payload?.from ?? '')
  const to = String(payload?.to ?? '')
  const absFrom = resolveInsideRoot(root, from)
  const absTo = resolveInsideRoot(root, to)
  await fsp.mkdir(path.dirname(absTo), { recursive: true })
  await fsp.rename(absFrom, absTo)
  return true
})

ipcMain.handle('workspace:delete', async (_event, payload: { root: string; path: string }) => {
  const root = String(payload?.root ?? '')
  const rel = String(payload?.path ?? '')
  const abs = resolveInsideRoot(root, rel)
  await fsp.rm(abs, { recursive: true, force: true })
  return true
})

ipcMain.handle('workspace:gitStatus', async (_event, payload: { root: string }) => {
  const root = String(payload?.root ?? '')
  const rootAbs = path.resolve(root)
  try {
    const branch = await new Promise<string>((resolve, reject) => {
      const p = spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: rootAbs })
      let out = ''
      p.stdout.on('data', (d) => (out += String(d)))
      p.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error('git error'))))
    })
    const files = await new Promise<{ path: string; status: string }[]>((resolve) => {
      const p = spawn('git', ['status', '--porcelain'], { cwd: rootAbs })
      let out = ''
      p.stdout.on('data', (d) => (out += String(d)))
      p.on('close', () => {
        const lines = out.split('\n').filter((l) => l.trim().length > 0)
        const result = lines.map((line) => {
          const status = line.slice(0, 2)
          const filePath = line.slice(3).trim()
          return { path: filePath, status }
        })
        resolve(result)
      })
    })
    return { branch, changes: files.length, files }
  } catch {
    return null
  }
})

ipcMain.handle('workspace:gitDiff', async (_event, payload: { root: string; path: string }) => {
  const root = String(payload?.root ?? '')
  const rel = String(payload?.path ?? '')
  const rootAbs = path.resolve(root)
  try {
    return await new Promise<string>((resolve, reject) => {
      // 获取已暂存或未暂存的差异
      const p = spawn('git', ['diff', 'HEAD', '--', rel], { cwd: rootAbs })
      let out = ''
      p.stdout.on('data', (d) => (out += String(d)))
      p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error('git diff error'))))
    })
  } catch {
    return ''
  }
})

ipcMain.handle('workspace:gitCommit', async (_event, payload: { root: string; message: string; addAll?: boolean }) => {
  const root = String(payload?.root ?? '')
  const message = String(payload?.message ?? 'update')
  const addAll = !!payload?.addAll
  const rootAbs = path.resolve(root)
  try {
    if (addAll) {
      await new Promise<void>((resolve, reject) => {
        const p = spawn('git', ['add', '.'], { cwd: rootAbs })
        p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('git add failed'))))
      })
    }
    await new Promise<void>((resolve, reject) => {
      const p = spawn('git', ['commit', '-m', message], { cwd: rootAbs })
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('git commit failed'))))
    })
    return true
  } catch {
    return false
  }
})

ipcMain.handle('workspace:gitAdd', async (_event, payload: { root: string; path: string }) => {
  const root = String(payload?.root ?? '')
  const rel = String(payload?.path ?? '')
  const rootAbs = path.resolve(root)
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn('git', ['add', rel], { cwd: rootAbs })
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('git add failed'))))
    })
    return true
  } catch {
    return false
  }
})

ipcMain.handle('workspace:gitReset', async (_event, payload: { root: string; path: string }) => {
  const root = String(payload?.root ?? '')
  const rel = String(payload?.path ?? '')
  const rootAbs = path.resolve(root)
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn('git', ['reset', 'HEAD', rel], { cwd: rootAbs })
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('git reset failed'))))
    })
    return true
  } catch {
    return false
  }
})

ipcMain.handle('workspace:gitPush', async (_event, payload: { root: string }) => {
  const root = String(payload?.root ?? '')
  const rootAbs = path.resolve(root)
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn('git', ['push'], { cwd: rootAbs })
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('git push failed'))))
    })
    return true
  } catch {
    return false
  }
})

ipcMain.handle('workspace:gitPull', async (_event, payload: { root: string }) => {
  const root = String(payload?.root ?? '')
  const rootAbs = path.resolve(root)
  try {
    await new Promise<void>((resolve, reject) => {
      const p = spawn('git', ['pull'], { cwd: rootAbs })
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('git pull failed'))))
    })
    return true
  } catch {
    return false
  }
})

// --- 笔记中心 IPC ---
const getNotesDir = () => {
  const notesDir = path.join(app.getPath('userData'), 'notes')
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true })
  }
  return notesDir
}

ipcMain.handle('notes:list', async () => {
  const notesDir = getNotesDir()
  const entries = await fsp.readdir(notesDir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => ({
      name: e.name,
      id: e.name,
      updatedAt: fs.statSync(path.join(notesDir, e.name)).mtimeMs,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
})

ipcMain.handle('notes:read', async (_event, id: string) => {
  const notesDir = getNotesDir()
  const abs = path.join(notesDir, id)
  if (!abs.startsWith(notesDir)) throw new Error('Invalid path')
  return await fsp.readFile(abs, 'utf-8')
})

ipcMain.handle('notes:write', async (_event, id: string, content: string) => {
  const notesDir = getNotesDir()
  const abs = path.join(notesDir, id)
  if (!abs.startsWith(notesDir)) throw new Error('Invalid path')
  await fsp.writeFile(abs, content, 'utf-8')
  return true
})

ipcMain.handle('notes:delete', async (_event, id: string) => {
  const notesDir = getNotesDir()
  const abs = path.join(notesDir, id)
  if (!abs.startsWith(notesDir)) throw new Error('Invalid path')
  await fsp.rm(abs)
  return true
})

ipcMain.handle('notes:create', async (_event, name: string) => {
  const notesDir = getNotesDir()
  const fileName = name.endsWith('.md') ? name : `${name}.md`
  const abs = path.join(notesDir, fileName)
  if (fs.existsSync(abs)) throw new Error('笔记已存在')
  await fsp.writeFile(abs, '# ' + name + '\n\n在这里记录你的想法...', 'utf-8')
  return fileName
})

app.on('window-all-closed', () => {
  win = null
  stopKernel()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
app.whenReady().then(installAppMenu)
app.whenReady().then(() => startKernel().catch(() => {}))
