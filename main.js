const { app, BrowserWindow, session, shell } = require('electron')
const path = require('path')
const http  = require('http')
const fs    = require('fs')

// Empêche plusieurs instances
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// ── Serveur HTTP local (donne une vraie origine http:// à l'app) ──────────────
// Cela résout les restrictions CORS/fetch depuis file:// vers HuggingFace etc.
const APP_PORT = 48765

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
      const urlPath   = (req.url || '/').split('?')[0]
      const filePath  = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath)

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('Not Found')
          return
        }
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, {
          'Content-Type':  MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        })
        res.end(data)
      })
    })

    localServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port déjà occupé — on choisit un port aléatoire
        localServer.listen(0, '127.0.0.1')
      } else {
        reject(err)
      }
    })

    localServer.listen(APP_PORT, '127.0.0.1', () => {
      resolve(localServer.address().port)
    })
  })
}
// ─────────────────────────────────────────────────────────────────────────────

let mainWindow = null

function createWindow (port) {
  mainWindow = new BrowserWindow({
    width:     1280,
    height:    800,
    minWidth:  900,
    minHeight: 600,
    title:     'AudioBook Creator',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      // webSecurity activé (on est sur http://, le CORS fonctionne normalement)
      webSecurity:      true,
    },
  })

  // Autorise toutes les permissions (microphone, speech, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(true)
  })
  session.defaultSession.setPermissionCheckHandler(() => true)

  // Charge l'app depuis le serveur local
  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`)

  // Ouvre les liens externes dans le navigateur du système, pas dans l'app
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

// Réouvre la fenêtre si l'app est réactivée (macOS)
app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const port = localServer ? localServer.address().port : await startLocalServer()
    createWindow(port)
  }
})

// Quitte sur Windows/Linux quand toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
  if (localServer) localServer.close()
  if (process.platform !== 'darwin') app.quit()
})

// Deuxième instance → focus sur la fenêtre existante
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})
