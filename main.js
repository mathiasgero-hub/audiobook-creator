const { app, BrowserWindow, ipcMain, net, session, shell } = require('electron')
const path = require('path')

// Empêche plusieurs instances
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let mainWindow = null

function createWindow() {
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
      webSecurity:      false,
      preload:          path.join(__dirname, 'preload.js'),
    },
  })

  // Autorise toutes les permissions (microphone, speech, etc.)
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => {
    callback(true)
  })
  session.defaultSession.setPermissionCheckHandler(() => true)

  mainWindow.loadFile('index.html')

  // Ouvre les liens externes dans le navigateur du système, pas dans l'app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── IPC : proxy fetch pour les URLs bloquées depuis file:// ───────────────────
ipcMain.handle('proxy-fetch', async (_event, url, options = {}) => {
  try {
    const resp = await net.fetch(url, {
      method:  options.method  || 'GET',
      headers: options.headers || {},
    })
    const buffer  = Buffer.from(await resp.arrayBuffer())
    const headers = {}
    resp.headers.forEach((v, k) => { headers[k] = v })
    return { ok: resp.ok, status: resp.status, headers, data: buffer.toString('base64') }
  } catch (e) {
    return { ok: false, status: 0, headers: {}, data: '', error: e.message }
  }
})
// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(createWindow)

// Réouvre la fenêtre si l'app est réactivée (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Quitte sur Windows/Linux quand toutes les fenêtres sont fermées
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Deuxième instance → focus sur la fenêtre existante
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})
