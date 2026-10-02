import { app, BrowserWindow, ipcMain, shell, Menu, nativeTheme } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  startApiServer,
  stopApiServer,
  getApiServerStatus,
} from '../server/apiServer.mjs';

// Force dark mode for OS window decorations, system dialogs, and caption controls
nativeTheme.themeSource = 'dark';

// Remove default application menu bar
Menu.setApplicationMenu(null);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_INDEX = path.join(__dirname, '..', 'dist', 'index.html');

let mainWindow = null;

// Determine safe writable storage directory for user data & server configuration
function getStoragePaths() {
  const userDataDir = app.getPath('userData');
  try {
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }
  } catch {}

  const bundledDataFile = path.join(__dirname, '..', 'devvault-data.json');
  const userDataFile = path.join(userDataDir, 'devvault-data.json');
  const userConfigFile = path.join(userDataDir, 'server-config.json');

  // In packaged app (Linux native binary, AppImage, deb, etc.), always use userData to avoid read-only asar.
  // In development (unpackaged), if project root is writable, use project root; otherwise userData.
  let dataFile = userDataFile;
  let configFile = userConfigFile;

  if (!app.isPackaged) {
    const devDataFile = path.join(__dirname, '..', 'devvault-data.json');
    const devConfigFile = path.join(__dirname, '..', 'server-config.json');
    try {
      fs.accessSync(path.dirname(devDataFile), fs.constants.W_OK);
      dataFile = devDataFile;
      configFile = devConfigFile;
    } catch {
      dataFile = userDataFile;
      configFile = userConfigFile;
    }
  }

  // Ensure dataFile exists: if not in userData, copy bundled seed data file over
  if (!fs.existsSync(dataFile) && fs.existsSync(bundledDataFile)) {
    try {
      fs.copyFileSync(bundledDataFile, dataFile);
    } catch (e) {
      console.warn('[Electron] Note: could not seed data file from bundle:', e.message);
    }
  }

  return { dataFile, configFile };
}

// Read stored server configuration
function loadServerConfig() {
  const { configFile } = getStoragePaths();
  if (fs.existsSync(configFile)) {
    try {
      return JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch {}
  }
  return {
    enabled: false,
    port: 4141,
    apiKey: '',
    allowWrite: false,
  };
}

// Persist server configuration
function saveServerConfig(cfg) {
  try {
    const { configFile } = getStoragePaths();
    const dir = path.dirname(configFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Electron] Error writing server-config.json:', err);
    return false;
  }
}

async function createWindow() {
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';

  const windowOptions = {
    width: 1280,
    height: 840,
    minWidth: 920,
    minHeight: 600,
    backgroundColor: '#0d1117',
    title: 'DevVault: CLI & Code Notebook',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
    show: false,
  };

  if (isMac) {
    // Hide native titlebar on macOS and seamlessly inset dark traffic lights
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 14, y: 14 };
  } else if (isWindows) {
    // Hide bulky titlebar on Windows and render dark controls overlay
    windowOptions.titleBarStyle = 'hidden';
    windowOptions.titleBarOverlay = {
      color: '#0d1117',
      symbolColor: '#c9d1d9',
      height: 34,
    };
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Completely hide and remove menu bar from the window
  mainWindow.setMenuBarVisibility(false);
  if (typeof mainWindow.removeMenu === 'function') {
    mainWindow.removeMenu();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env.DEVVAULT_DEV_URL || (process.argv.includes('--dev') ? 'http://localhost:8081' : null);

  if (devUrl) {
    console.log(`[Electron] Loading development URL: ${devUrl}`);
    await mainWindow.loadURL(devUrl);
  } else if (fs.existsSync(DIST_INDEX)) {
    console.log(`[Electron] Loading production bundle: ${DIST_INDEX}`);
    await mainWindow.loadFile(DIST_INDEX);
  } else {
    console.warn(`[Electron] dist/index.html not found, fallback to dev server at http://localhost:8081`);
    await mainWindow.loadURL('http://localhost:8081');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for In-App API Server Management
ipcMain.handle('server:start', async (_event, customConfig) => {
  try {
    const { dataFile, configFile } = getStoragePaths();
    const config = customConfig || loadServerConfig();
    const result = await startApiServer({
      port: config.port || 4141,
      apiKey: config.apiKey || '',
      allowWrite: Boolean(config.allowWrite),
      dataFile,
      configFile,
      host: '0.0.0.0',
      silent: false,
    });

    // Mark as enabled in config
    const savedConfig = { ...config, enabled: true };
    saveServerConfig(savedConfig);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server:state-change', {
        running: true,
        port: result.port,
        url: result.url,
      });
    }

    return { success: true, port: result.port, url: result.url };
  } catch (err) {
    console.error('[Electron] Error starting API server:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('server:stop', async () => {
  try {
    await stopApiServer();
    const cfg = loadServerConfig();
    saveServerConfig({ ...cfg, enabled: false });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server:state-change', {
        running: false,
      });
    }

    return { success: true };
  } catch (err) {
    console.error('[Electron] Error stopping API server:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('server:status', async () => {
  return getApiServerStatus();
});

ipcMain.handle('server:getConfig', async () => {
  return loadServerConfig();
});

ipcMain.handle('server:saveConfig', async (_event, cfg) => {
  return saveServerConfig(cfg);
});

// IPC Handlers for Snippet Sync
ipcMain.handle('sync:saveSnippets', async (_event, snippets) => {
  try {
    const { dataFile } = getStoragePaths();
    const dir = path.dirname(dataFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(snippets, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync:loadSnippets', async () => {
  const { dataFile } = getStoragePaths();
  if (fs.existsSync(dataFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return null;
});

// App Utility Handlers
ipcMain.handle('shell:openExternal', async (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform; // 'win32' | 'linux' | 'darwin'
});

// Window State Management Handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
});

// Application Lifecycle
app.whenReady().then(async () => {
  await createWindow();

  // Auto-start embedded API server if previously enabled in server-config.json
  const cfg = loadServerConfig();
  if (cfg.enabled) {
    try {
      const { dataFile, configFile } = getStoragePaths();
      console.log(`[Electron] Auto-starting embedded API server on port ${cfg.port || 4141}...`);
      await startApiServer({
        port: cfg.port || 4141,
        apiKey: cfg.apiKey || '',
        allowWrite: Boolean(cfg.allowWrite),
        dataFile,
        configFile,
        host: '0.0.0.0',
        silent: false,
      });
    } catch (err) {
      console.warn('[Electron] Auto-start API server encountered an error:', err.message);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  try {
    await stopApiServer();
  } catch {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
