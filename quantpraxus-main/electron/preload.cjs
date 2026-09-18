const { contextBridge, ipcRenderer } = require('electron');

// Renderer tarafında window.electronAPI.
contextBridge.exposeInMainWorld('electronAPI', {

  // Pencereyi küçült
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  goBack: () => ipcRenderer.send('window-go-back'),
  goForward: () => ipcRenderer.send('window-go-forward'),
    reload: () => ipcRenderer.send('window-reload'),

  // Tam ekran modunu aç veya kapat.
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),

  // Tam ekran durumundaki değişiklikleri dinler.
  onFullscreenChange: (callback) => {

    ipcRenderer.on('fullscreen-changed', (event, isFullscreen) => {
      callback(isFullscreen);
    });

  },
  isElectron: true

});