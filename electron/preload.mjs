// Set data attributes on html element and inject initial pointer cursor styles for Electron
if (typeof document !== 'undefined') {
  const setPlatformAttrsAndStyles = () => {
    if (document.documentElement) {
      document.documentElement.setAttribute('data-electron', 'true');
      document.documentElement.setAttribute('data-electron-platform', process.platform);
    }
    if (document.head && !document.getElementById('electron-base-pointer-styles')) {
      const style = document.createElement('style');
      style.id = 'electron-base-pointer-styles';
      style.textContent = `
        button, a, [role="button"], [role="tab"], [role="link"], .r-cursor-1loqt21, div[tabindex="0"]:not(input):not(textarea) {
          cursor: pointer !important;
          -webkit-app-region: no-drag !important;
        }
        button *, a *, [role="button"] *, [role="tab"] *, [role="link"] *, .r-cursor-1loqt21 *, div[tabindex="0"]:not(input):not(textarea) * {
          cursor: pointer !important;
          -webkit-app-region: no-drag !important;
        }
      `;
      document.head.appendChild(style);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setPlatformAttrsAndStyles);
  } else {
    setPlatformAttrsAndStyles();
  }
}

/**
 * Preload Script exposing secure IPC bridge to DevVault UI
 */
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),

  // Window State Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),

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
