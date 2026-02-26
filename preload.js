const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * @returns {Promise<any>}
   */
  loadConfig: () => ipcRenderer.invoke('load-config'),

  /**
   * @param {any} data
   * @returns {Promise<any>}
   */
  saveAndBuild: (data) => ipcRenderer.invoke('save-and-build', data),

  /**
   * @returns {void}
   */
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),

  /**
   * @returns {void}
   */
  exitFullscreen: () => ipcRenderer.send('exit-fullscreen'),
});
