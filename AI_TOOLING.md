# 🤖 DevVault AI Tooling & Command Execution Guide

> **Purpose**: This file serves as the definitive reference for AI tools, autonomous agents, and pair-programming assistants working on the **DevVault** codebase. It outlines which executables, package managers, and commands to use for every task, along with critical runtime constraints and environment requirements.

---

## ⚡ 1. Node.js & Shell Environment

### Active Node Runtime
The project runs on **Node.js v26.10.0**. In non-interactive subshells or agent sandbox environments, always ensure the active Node binary path is exported:

```bash
export PATH="/home/ethan/.nvm/versions/node/v26.10.0/bin:$PATH"
```

### Sandbox & File Permissions Tip
When running Expo CLI commands inside sandboxed environments, prepend `HOME=/tmp` to prevent permission errors when Expo attempts to write telemetry to `/home/ethan/.expo`:

```bash
HOME=/tmp npm run build:web
HOME=/tmp npx expo lint
```

---

## 📋 2. Task-to-Command Reference Matrix

| Task / Goal | Recommended Command | Notes |
| :--- | :--- | :--- |
| **Typecheck** | `npm run typecheck` | Runs `tsc --noEmit`. Must pass with 0 errors. |
| **Run Unit Tests** | `npm test` | Runs `node tests/runAllTests.mjs` across all 11 test suites. |
| **Full Verification** | `npm run test:all` | **MANDATORY** before declaring any task complete (`typecheck && test`). |
| **Lint Codebase** | `HOME=/tmp npm run lint` | Runs `expo lint` (`eslint`). |
| **Web Production Export** | `HOME=/tmp npm run build:web` | Exports static bundle to `dist/` via `expo export --platform web`. |
| **Start Web Dev Server** | `npm run web` | Launches Metro bundler for web on `http://localhost:8081`. |
| **Start Mobile (iOS/Android)**| `npm run ios` or `npm run android` | Starts Metro with target platform flag. |
| **Desktop App (Dev Mode)** | `npm run desktop:dev` | Launches Electron connected to active Metro dev server. |
| **Desktop App (Production)** | `npm run desktop:start` | Builds web bundle into `dist/` and runs Electron with `--no-sandbox`. |
| **Package Linux Unpacked** | `npm run build:desktop:dir` | Packages native directory in `release/linux-unpacked/`. |
| **Package Linux Installers** | `npm run build:linux` | Builds AppImage, Debian `.deb`, and `tar.gz` packages. |
| **Package Windows** | `npm run build:win` | Builds NSIS installer, portable `.exe`, and `.zip` for Windows. |
| **Package macOS** | `npm run build:mac` | Builds `.dmg` and `.zip` for macOS. |
| **Package All Platforms** | `npm run build:all` | Builds Windows, Linux, and macOS simultaneously. |
| **Start Standalone API Server**| `npm run api:start` | Runs `node server/apiServer.mjs` (defaults to port `4141`). |

---

## 📦 3. Package Management & Installation Rules

### Package Manager
- **Primary**: `npm` (project root contains `package-lock.json`).
- If `bun.lock` is ever present, use `bun` / `bunx`.

### Expo SDK 57 Compatible Packages
- **NEVER** use bare `npm install <package>` for packages that touch React Native or Expo APIs.
- **ALWAYS** use `npx expo install <package>` — this resolves versions that are strictly compatible with Expo SDK 57.
- To resolve dependency version conflicts or outdated peer dependencies:
  ```bash
  npx expo install --fix
  npx expo-doctor
  ```

### Dev Dependencies
- For tooling, build scripts, or type definitions that do not touch native code:
  ```bash
  npm install -D <package>
  ```

---

## 🧪 4. Testing & Verification Protocol

DevVault maintains a **zero-dependency ESM test suite** located in `tests/` powered by Node's native `assert` module and `tests/ts-loader.mjs`:

```bash
# Run all test suites
npm run test:all
```

### Included Test Suites (11 Suites)
1. **Template Parameter Parser** (`tests/testTemplateParser.mjs`): Placeholders, defaults, substitution.
2. **Search & Relevance Engine** (`tests/testSearchEngine.mjs`): Token scoring, tags, category filtering.
3. **Syntax Highlighting Tokenizer** (`tests/testSyntaxHighlighter.mjs`): Regex tokenization across 5 languages.
4. **DevVault Importer & Deduplication** (`tests/testImporter.mjs`): Peer import & dedup rules.
5. **Terminal Cards & Shell Comments** (`tests/testTerminalComment.mjs`): Comment lines in terminal output.
6. **Terminal Emulator Type Guard** (`tests/testEmulatorTypeGuard.mjs`): Emulation eligibility (commands only).
7. **IDE Code Snippet Social Cards** (`tests/testCodeSnippetCard.mjs`): Vector SVG snippet image generation.
8. **SVG Card XML Well-Formedness** (`tests/validateSvgXml.mjs`): XML attribute and tag conformance.
9. **Programmatic Embedded API Server** (`tests/testEmbeddedServer.mjs`): In-process server lifecycle & endpoints.
10. **App-Wide Environments & Variables** (`tests/testEnvironmentVariables.mjs`): Precedence, active env resolution.
11. **Electron Window & Menu Bar Config** (`tests/testElectronWindowConfig.mjs`): Dark decorations, hidden menus, drag regions, pointer cursor.

> [!IMPORTANT]
> **Always run `npm run test:all` before finishing any task.** All 11 suites must pass and `tsc --noEmit` must report 0 errors.

---

## 🖥️ 5. Electron & Desktop Native App Architecture

### Key Files
- [`electron/main.mjs`](file:///home/ethan/projects/cli-programmer-notebook/electron/main.mjs): Main process entrypoint, window creation, lifecycle, and IPC handlers.
- [`electron/preload.mjs`](file:///home/ethan/projects/cli-programmer-notebook/electron/preload.mjs): Secure context bridge exposing `window.electronAPI`.

### Critical Architecture Rules for AI Agents
1. **Read-Only `app.asar` File System**:
   - In packaged builds (AppImage, deb, Windows installer, `linux-unpacked`), the app code resides inside `resources/app.asar`, which is **read-only**.
   - **NEVER** write runtime data, configuration files, or database snapshots to `__dirname` or project root when running packaged.
   - **ALWAYS** use `app.getPath('userData')` (e.g., `~/.config/DevVault` on Linux, `%APPDATA%\DevVault` on Windows) via the `getStoragePaths()` helper.
2. **Window Decorations & Dark Mode**:
   - Native dark mode is enforced via `nativeTheme.themeSource = 'dark'`.
   - Windows uses `titleBarStyle: 'hidden'` with `titleBarOverlay: { color: '#0d1117', symbolColor: '#c9d1d9', height: 34 }`.
   - macOS uses `titleBarStyle: 'hiddenInset'` with traffic lights inset at `(14, 14)`.
   - Application menu is permanently removed via `Menu.setApplicationMenu(null)` and `mainWindow.removeMenu()`.
3. **Window Dragging & Pointer Cursor**:
   - The top header has `-webkit-app-region: drag` for window movement.
   - **ALL** buttons, touchables, inputs, chips, and child elements MUST have `-webkit-app-region: no-drag !important;` and `cursor: pointer !important;`.
   - Global pointer styles are injected via [`src/theme/injectGlobalWebStyles.ts`](file:///home/ethan/projects/cli-programmer-notebook/src/theme/injectGlobalWebStyles.ts) and [`electron/preload.mjs`](file:///home/ethan/projects/cli-programmer-notebook/electron/preload.mjs).
4. **Embedded API Server in Electron**:
   - The API server binds explicitly to `0.0.0.0` for universal IPv4/IPv6 reachability.
   - Inside Electron (`isDesktop`), the UI queries server health via IPC (`window.electronAPI.getServerStatus()`) rather than HTTP `fetch()`, avoiding CORS or local `file://` security blocks.

---

## 📱 6. Mobile & Expo CNG (Continuous Native Generation)

- **Do NOT manually edit or create `ios/` or `android/` folders**: These directories are automatically managed by Expo prebuild / CNG.
- Native configuration must be defined in [`app.json`](file:///home/ethan/projects/cli-programmer-notebook/app.json) using config plugins.
- Use EAS for native builds: `npx eas-cli@latest build`.

---

## 🛠️ 7. CLI API Server Reference

When testing or running the embedded API server directly from the command line:

```bash
# Start server on default port (4141)
node server/apiServer.mjs

# Start server on custom port with API authentication and writes enabled
node server/apiServer.mjs --port 5000 --api-key my-secret-token --allow-write

# Query endpoints
curl http://localhost:4141/api/health
curl http://localhost:4141/api/commands
curl http://localhost:4141/api/recipes
curl http://localhost:4141/api/snippets
curl http://localhost:4141/api/raw/:id
```
