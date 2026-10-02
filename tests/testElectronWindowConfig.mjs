import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('Testing Electron Window Decorations & Menu Bar Configuration...\n');

// 1. Validate electron/main.mjs configuration
const mainPath = path.join(rootDir, 'electron', 'main.mjs');
assert.ok(fs.existsSync(mainPath), 'electron/main.mjs should exist');
const mainContent = fs.readFileSync(mainPath, 'utf8');

// Check nativeTheme dark mode
assert.ok(
  mainContent.includes("nativeTheme.themeSource = 'dark'"),
  'main.mjs must set nativeTheme.themeSource to dark for window decorations'
);

// Check Menu removal
assert.ok(
  mainContent.includes('Menu.setApplicationMenu(null)'),
  'main.mjs must call Menu.setApplicationMenu(null) to remove the application menu'
);

// Check BrowserWindow menu hiding options
assert.ok(
  mainContent.includes('autoHideMenuBar: true'),
  'BrowserWindow options must include autoHideMenuBar: true'
);
assert.ok(
  mainContent.includes('setMenuBarVisibility(false)'),
  'main.mjs must call setMenuBarVisibility(false) on mainWindow'
);
assert.ok(
  mainContent.includes('removeMenu()'),
  'main.mjs must call removeMenu() on mainWindow'
);

// Check platform-specific titlebar styles
assert.ok(
  mainContent.includes("windowOptions.titleBarStyle = 'hiddenInset'"),
  'main.mjs must configure titleBarStyle: hiddenInset for macOS'
);
assert.ok(
  mainContent.includes("windowOptions.titleBarStyle = 'hidden'"),
  'main.mjs must configure titleBarStyle: hidden for Windows'
);
assert.ok(
  mainContent.includes('titleBarOverlay'),
  'main.mjs must configure titleBarOverlay for Windows controls'
);

// Check window IPC handlers
assert.ok(mainContent.includes("'window:minimize'"), 'main.mjs must handle window:minimize IPC');
assert.ok(mainContent.includes("'window:maximize'"), 'main.mjs must handle window:maximize IPC');
assert.ok(mainContent.includes("'window:close'"), 'main.mjs must handle window:close IPC');
assert.ok(mainContent.includes("'window:isMaximized'"), 'main.mjs must handle window:isMaximized IPC');

console.log('✔ Test 1 Passed: electron/main.mjs properly configures dark window decorations and hides menu bar.');

// 2. Validate electron/preload.mjs
const preloadPath = path.join(rootDir, 'electron', 'preload.mjs');
assert.ok(fs.existsSync(preloadPath), 'electron/preload.mjs should exist');
const preloadContent = fs.readFileSync(preloadPath, 'utf8');

assert.ok(
  preloadContent.includes('data-electron') && preloadContent.includes('data-electron-platform'),
  'preload.mjs must inject data-electron and data-electron-platform attributes'
);
assert.ok(preloadContent.includes('minimizeWindow:'), 'preload.mjs must expose minimizeWindow');
assert.ok(preloadContent.includes('maximizeWindow:'), 'preload.mjs must expose maximizeWindow');
assert.ok(preloadContent.includes('closeWindow:'), 'preload.mjs must expose closeWindow');

console.log('✔ Test 2 Passed: electron/preload.mjs properly exposes window controls and platform attributes.');

// 3. Validate window drag & dark styling in injectGlobalWebStyles.ts
const stylesPath = path.join(rootDir, 'src', 'theme', 'injectGlobalWebStyles.ts');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');

assert.ok(
  stylesContent.includes('-webkit-app-region: drag'),
  'injectGlobalWebStyles.ts must declare drag region for frameless window movement'
);
assert.ok(
  stylesContent.includes('-webkit-app-region: no-drag'),
  'injectGlobalWebStyles.ts must declare no-drag region for buttons and inputs'
);
assert.ok(
  stylesContent.includes('cursor: pointer !important'),
  'injectGlobalWebStyles.ts must enforce cursor: pointer !important for interactive elements'
);
assert.ok(
  stylesContent.includes('.r-cursor-1loqt21 *') || stylesContent.includes('.r-cursor-1loqt21'),
  'injectGlobalWebStyles.ts must target .r-cursor-1loqt21 and descendants for pointer cursor'
);
assert.ok(
  stylesContent.includes('div[tabindex="0"]'),
  'injectGlobalWebStyles.ts must target div[tabindex="0"] for touchable buttons'
);

assert.ok(
  preloadContent.includes('electron-base-pointer-styles'),
  'preload.mjs must inject initial electron-base-pointer-styles stylesheet'
);

console.log('✔ Test 3 Passed: Global styles & preload enforce pointer cursor on all buttons and touchables.\n');

console.log('All Electron Window & Menu Bar configuration tests passed successfully!\n');
