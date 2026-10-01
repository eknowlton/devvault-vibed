import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  startApiServer,
  stopApiServer,
  getApiServerStatus,
} from '../server/apiServer.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'devvault-data.json');
const CONFIG_FILE = path.join(__dirname, '..', 'server-config.json');
const DIST_INDEX = path.join(__dirname, '..', 'dist', 'index.html');

let mainWindow = null;

// Read stored server configuration
function loadServerConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[Electron] Error writing server-config.json:', err);
    return false;
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 920,
    minHeight: 600,
    backgroundColor: '#0d1117',
    title: 'DevVault: CLI & Code Notebook',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

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
    const config = customConfig || loadServerConfig();
    const result = await startApiServer({
      port: config.port || 4141,
      apiKey: config.apiKey || '',
      allowWrite: Boolean(config.allowWrite),
      dataFile: DATA_FILE,
      configFile: CONFIG_FILE,
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
    fs.writeFileSync(DATA_FILE, JSON.stringify(snippets, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sync:loadSnippets', async () => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
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

// Application Lifecycle
app.whenReady().then(async () => {
  await createWindow();

  // Auto-start embedded API server if previously enabled in server-config.json
  const cfg = loadServerConfig();
  if (cfg.enabled) {
    try {
      console.log(`[Electron] Auto-starting embedded API server on port ${cfg.port || 4141}...`);
      await startApiServer({
        port: cfg.port || 4141,
        apiKey: cfg.apiKey || '',
        allowWrite: Boolean(cfg.allowWrite),
        dataFile: DATA_FILE,
        configFile: CONFIG_FILE,
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
