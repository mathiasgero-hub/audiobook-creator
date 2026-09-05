const { contextBridge, ipcRenderer } = require('electron')

// Expose un fetch proxy vers le process principal pour contourner les
// restrictions CORS de file:// (utilisé par Kokoro / HuggingFace)
contextBridge.exposeInMainWorld('electronAPI', {
  proxyFetch: (url, options) => ipcRenderer.invoke('proxy-fetch', url, options)
})
