const { app, BrowserWindow, session, shell } = require('electron')
const path = require('path')
const http = require('http')
const fs   = require('fs')

// Empêche plusieurs instances
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
}

let localServer = null

function startLocalServer () {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      const urlPath  = (req.url || '/').split('?')[0]
      const filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath)
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not Found'); return }
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
        res.end(data)
      })
    })
    localServer.on('error', reject)
    localServer.listen(48765, '127.0.0.1', () => resolve(localServer.address().port))
  })
}

let mainWindow = null

function createWindow (port) {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    title: 'AudioBook Creator',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
    },
  })

  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) => cb(true))
  session.defaultSession.setPermissionCheckHandler(() => true)

  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  const port = await startLocalServer()
  createWindow(port)
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const port = localServer ? localServer.address().port : await startLocalServer()
    createWindow(port)
  }
})

app.on('window-all-closed', () => {
  if (localServer) localServer.close()
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})
