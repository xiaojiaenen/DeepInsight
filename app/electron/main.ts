import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'

const DIST = path.join(__dirname, '../dist')
const PUBLIC = app.isPackaged ? DIST : path.join(DIST, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

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
    win.webContents.openDevTools()
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
