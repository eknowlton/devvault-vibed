import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload Script exposing secure IPC bridge to DevVault UI
 */
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // In-App API Server Management
  startServer: (config) => ipcRenderer.invoke('server:start', config),
  stopServer: () => ipcRenderer.invoke('server:stop'),
  getServerStatus: () => ipcRenderer.invoke('server:status'),
  getServerConfig: () => ipcRenderer.invoke('server:getConfig'),
  saveServerConfig: (config) => ipcRenderer.invoke('server:saveConfig', config),

  // Real-time server state listener
  onServerStateChange: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('server:state-change', subscription);
    return () => ipcRenderer.removeListener('server:state-change', subscription);
  },

  // File synchronization
  saveSnippetsToFile: (snippets) => ipcRenderer.invoke('sync:saveSnippets', snippets),
  loadSnippetsFromFile: () => ipcRenderer.invoke('sync:loadSnippets'),

  // External Links
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
});
