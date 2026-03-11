const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  windowControl: (action) => ipcRenderer.send('window-control', action),
  onDeepLink: (callback) => ipcRenderer.on('on-deep-link', callback),
  openExternal: (url) => ipcRenderer.send('open-external', url)
});
