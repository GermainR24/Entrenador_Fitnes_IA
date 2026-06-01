const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const os   = require('os')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width:  420,
    height: 900,
    minWidth:  380,
    minHeight: 700,
    resizable: true,
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
    // Frameless look (optional — remove if you prefer native frame)
    // frame: false,
    backgroundColor: '#0a0c10',
  })

  if (isDev) {
    // Dev: load Vite dev server
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'undocked' })
  } else {
    // Prod: load built files
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC: expose system RAM to renderer ──────────────────────────────────────
ipcMain.handle('get-ram-info', () => ({
  total: os.totalmem(),
  free:  os.freemem(),
}))
