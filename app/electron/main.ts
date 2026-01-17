import { app, BrowserWindow, ipcMain } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'

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
app.whenReady().then(() => startKernel().catch(() => {}))
