const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  proxyFetch:  (url, options) => ipcRenderer.invoke('proxy-fetch', url, options),
  ttsGenerate: (text, voice)  => ipcRenderer.invoke('tts-generate', text, voice),
})
