const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  /** Returns { total: number, free: number } in bytes */
  getRamInfo: () => ipcRenderer.invoke('get-ram-info'),
})
