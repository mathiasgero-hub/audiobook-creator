const { app, BrowserWindow, session, shell, ipcMain } = require('electron')
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
      preload: path.join(__dirname, 'preload.js'),
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

// ===== Edge TTS (Microsoft Neural voices, gratuit, nécessite internet) =====
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts')

ipcMain.handle('tts-generate', async (_event, text, voice, speed) => {
  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(
      voice || 'fr-FR-DeniseNeural',
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    )
    // Convertir vitesse (0.75, 1.0, 1.5…) en pourcentage SSML (+0%, -25%, +50%…)
    const rate = speed && speed !== 1
      ? (speed >= 1 ? `+${Math.round((speed - 1) * 100)}%` : `-${Math.round((1 - speed) * 100)}%`)
      : '+0%'
    const { audioStream } = tts.toStream(text, { rate })
    const chunks = []
    await new Promise((resolve, reject) => {
      audioStream.on('data',  c => chunks.push(c))
      audioStream.on('end',   resolve)
      audioStream.on('error', reject)
    })
    return { mp3b64: Buffer.concat(chunks).toString('base64') }
  } catch (e) {
    console.error('[EdgeTTS]', e.message)
    return { error: e.message }
  }
})
