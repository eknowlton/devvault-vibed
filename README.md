# ⚡ DevVault — CLI & Developer Code Notebook

<div align="center">

```text
  ██████╗ ███████╗██╗   ██╗██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
  ██╔══██╗██╔════╝██║   ██║██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
  ██║  ██║█████╗  ██║   ██║██║   ██║███████║██║   ██║██║     ██║   
  ██║  ██║██╔══╝  ╚██╗ ██╔╝██║   ██║██╔══██║██║   ██║██║     ██║   
  ██████╔╝███████╗ ╚████╔╝ ╚██████╔╝██║  ██║╚██████╔╝███████╗██║   
  ╚═════╝ ╚══════╝  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   
```

**The offline-first personal notebook, cheat sheet, and command vault for developers, sysadmins, and terminal hackers.**

[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Web_•_iOS_•_Android_•_Desktop-8A2BE2?style=for-the-badge)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Features](#-key-features) • [Quick Start](#-quick-start) • [Terminal Emulator & Social Cards](#-terminal-emulation--social-sharing-cards) • [REST API Server](#-embedded-rest-api-server) • [Peer Vault Importer](#-peer-vault-importer--strict-deduplication) • [Template Parameters](#-template-parameters) • [Keyboard Shortcuts](#-keyboard-shortcuts) • [Architecture](#-project-architecture)

</div>

---

## 💡 Why DevVault?

Developers constantly juggle complex CLI flags (`ffmpeg`, `docker`, `kubectl`, `git`, `pg_dump`), system one-liners, and utility snippets scattered across shell histories, gists, and browser bookmarks.

**DevVault** brings them into one lightning-fast, terminal-dark workspace that runs everywhere:
- 💻 **Web & Desktop Browser** with keyboard navigation (`/`, `Cmd+N`, `Cmd+K`)
- 📱 **Mobile (iOS & Android)** with responsive drawer layout
- 🖥️ **Embedded Zero-Dependency API Server** so your shell, CI/CD scripts, or remote teammates can query and execute commands via `curl` (`curl .../api/raw/:id | bash`).

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🔍 Multi-Token Search** | Instant relevance-scored fuzzy and token search across titles, commands, descriptions, and `#tags`. |
| **🧩 Interactive Template Filler** | Auto-detects `{{PARAM}}` and `{{PARAM:default}}` placeholders. Fill values live with one-click copy. |
| **🎨 Syntax Highlighting** | Zero-dependency high-speed tokenizer for **Bash / Shell**, **TypeScript / JS**, **Python**, **SQL**, and **Dockerfile**. |
| **📏 Expandable Snippets** | Inline preview with line numbering and collapse toggles for long shell scripts or functions. |
| **📺 Terminal Emulation & Output** | Interactive CLI playback with customizable simulated machine user and hostname (`ethan@macbook-pro`, `root@prod-api-01`, `dev@archlinux ❯`), expected stdout/stderr output, typing animations, and latency metrics. |
| **📤 Social-Friendly Sharing Cards** | One-tap export to Unicode ASCII terminal boxes, Markdown blocks, Twitter/X & LinkedIn intent shares, and vector SVG images. |
| **🌐 Peer Vault Importer** | Connect to another developer's DevVault API server to inspect and import commands, recipes, and snippets with strict automated deduplication. |
| **🔒 Public vs. Private Visibility** | Mark sensitive credentials or internal company commands as `🔒 Private`, while keeping general snippets `🌐 Public`. |
| **🚀 Embedded REST API Server** | Lightweight Node.js server exposing dedicated endpoints for `/api/commands`, `/api/recipes`, `/api/snippets`, and remote importing. |
| **⚡ Terminal Dark Aesthetic** | Tokyo Night / Catppuccin-inspired dark theme with glowing neon custom scrollbars and responsive input focus rings. |
| **💾 Local-First & Backup** | Works 100% offline via AsyncStorage. Single-click JSON backup, export, and restore. |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v20 & v26)
- **npm** or **bun** / **yarn**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/cli-programmer-notebook.git
cd cli-programmer-notebook

# Install dependencies (SDK-compatible packages via Expo)
npm install
```

### 3. Launching the App

#### Web Browser (Desktop / Tablet):
```bash
npm run web
# Opens http://localhost:8081
```

#### Desktop App (Windows, macOS, Linux):
```bash
# Run desktop app directly:
npm run desktop:start

# Build standalone desktop packages in release/:
npm run build:win    # Builds Windows (.exe installer & portable)
npm run build:linux  # Builds Linux (.AppImage, .deb, .tar.gz)
npm run build:mac    # Builds macOS (.dmg, .zip)
npm run build:all    # Builds all desktop targets
```

#### Mobile (iOS / Android / Expo Go):
```bash
# Start the Metro bundler with QR code for Expo Go:
npm start

# Or directly target simulators:
npm run ios      # iOS Simulator (macOS)
npm run android  # Android Emulator
```

### 4. Running Tests
```bash
npm test         # Run all 9 unit & integration test suites
npm run test:all # Run TypeScript compilation check + test suites
```

### 5. Automated CI & GitHub Releases
- **Continuous Integration (`.github/workflows/ci.yml`)**: Automatically runs typecheck (`tsc --noEmit`) and all 9 test suites on pushes and pull requests to `master`.
- **Automated Releases (`.github/workflows/release.yml`)**: When tests pass, GitHub Actions compiles native desktop binaries across Windows, Linux, and macOS, publishing them to GitHub Repo Releases:
  ```bash
  # Push a version tag to trigger release build & publish:
  git tag v1.0.0
  git push origin v1.0.0
  ```
  Distributables attached to GitHub Releases:
  - 🪟 **Windows**: `.exe` (NSIS installer & portable standalone)
  - 🐧 **Linux**: `.AppImage`, `.deb`, and `.tar.gz`
  - 🍎 **macOS**: `.dmg` and `.zip`

---

## 📺 Terminal Emulation & Social Sharing Cards

DevVault features an interactive, virtual terminal emulator that simulates realistic command execution and outputs stunning, social-shareable cards for Twitter/X, LinkedIn, Discord, Slack, and GitHub.

Tap **"⚡ Emulate"** on any command or recipe card to open the interactive emulator.

```text
╭──[ ethan@macbook-pro:~ ]─────────────────────────────────────────╮
│ # Keep staged changes while rewinding commit HEAD                │
│ $ git reset --soft HEAD~1                                        │
├──────────────────────────────────────────────────────────────────┤
│ [main 4f1a92e] Changes applied cleanly.                          │
│  2 files changed, 18 insertions(+), 4 deletions(-)               │
│ ✔ Git operation completed in 48ms.                               │
│                                                                  │
│ [ ✔ exit 0  •  ⚡ 120ms  •  DevVault ]                           │
╰──────────────────────────────────────────────────────────────────╯
```

### ⚡ Interactive Emulation Features
- **Real-Time Typing Animation**: Simulates character-by-character shell entry with a blinking cursor (`▋`).
- **Playback Speed Selector**: Choose between standard speed (`1x`), fast speed (`2x`), or `instant` replay.
- **Terminal Comments & Annotations**: Add an explanatory shell comment or caution note (e.g. `# Keep staged changes while rewinding commit HEAD`) that renders directly inside the terminal emulation window, ASCII box, markdown codeblock, and SVG exports right above the command prompt.
- **Execution Lifecycle**: Displays realistic execution states ("Running command..." spinner), simulated latency (`⚡ 120ms`), and exit status badges (`● exit 0` / `✘ exit 1`).
- **Simulated Stdout / Stderr**: Customize expected command outputs with one-tap presets for **Success messages**, **JSON responses**, and **CLI Tables**. Tap **"Save Output to Recipe"** to persist your custom output directly to your vault database.

### 💻 Machine Environment & Hostname Customization
Customize the simulated environment to match whatever machine you want to showcase:
- **Username**: e.g., `ethan`, `root`, `ubuntu`, `admin`, `dev`
- **Hostname**: e.g., `macbook-pro`, `prod-api-01`, `aws-ec2`, `k8s-master`, `archlinux`
- **Working Directory (CWD)**: e.g., `~`, `/etc/nginx`, `~/projects/app`, `/var/log`
- **Prompt Symbols**: `$`, `#` (root auto-select), `❯`, `>`
- **Quick Machine Presets**:
  - 💻 **MacBook Pro**: `ethan@macbook-pro:~ $`
  - 🔒 **Linux Production Root**: `root@prod-api-01:/etc #`
  - ☁️ **AWS EC2 Cloud**: `ubuntu@aws-ec2:~/app $`
  - ⚡ **Starship / Arch**: `dev@archlinux:~ ❯`

### 📤 5 Social Export Formats
| Format | Description & Compatibility |
| :--- | :--- |
| **🔲 Unicode ASCII Box** | High-fidelity Unicode box-drawing frame (`╭─`, `│`, `╰─`). Renders natively in monospaced fonts on **GitHub Issues/PRs**, **Discord**, **Reddit**, **Slack**, and emails. |
| **📝 Markdown Codeblock** | Formatted ````bash ... ```` block with prompt, commands, output, and execution summary comment ready for blogs and documentation. |
| **🐦 X / Twitter Post** | One-tap button that pre-populates a tweet intent with the command, prompt, simulated output, and developer hashtags (`#DevVault #Terminal #CLI`). |
| **💼 LinkedIn Post** | Share DevOps tips, deployment snippets, and workflow recipes directly with professional engineering networks. |
| **🖼️ Vector SVG Image** | Standalone high-resolution SVG download featuring a macOS-framed window with traffic lights (`🔴 🟡 🟢`), subtle glow borders, and drop-shadows. Available in 5 vibrant color themes: **Cyberpunk** (cyan/neon), **Tokyo Night** (soft purple), **Dracula** (pink/purple), **Matrix** (emerald hacker green), and **Obsidian** (dark minimal). |

---

## 💻 Code Snippet Social Cards & IDE Mockups

While commands have their own Terminal Emulator, code snippets (`type === 'snippet'`) feature a dedicated **IDE Social Card Generator** designed to showcase functions, algorithms, and components in a stylish code editor mockup (like Ray.so / Carbon).

Tap **"🖼️ IDE Card"** on any code snippet card to launch the editor preview.

```text
╭──[ 📄 usedebounce-hook.ts ]───────────────────────────────────────╮
│ // 💡 Custom React Debounce Hook                                  │
│ // Delays updating value until user stops typing.                 │
├───────────────────────────────────────────────────────────────────┤
│ 1 │ import { useState, useEffect } from 'react';                  │
│ 2 │                                                               │
│ 3 │ export function useDebounce<T>(value: T, delay: number): T {  │
│ 4 │   const [debounced, setDebounced] = useState<T>(value);       │
│ 5 │   return debounced;                                           │
│ 6 │ }                                                             │
├───────────────────────────────────────────────────────────────────┤
│ [ TYPESCRIPT • 6 lines • DevVault IDE ]                           │
╰───────────────────────────────────────────────────────────────────╯
```

### 🎨 IDE Mockup Features
- **IDE Window Chrome**: macOS traffic light buttons (`🔴 🟡 🟢`), active editor tab with file icon (`📄 usedebounce.ts`), close button, and language badge.
- **Syntax Highlighting Engine**: Full language-aware syntax tokenization (TypeScript, JavaScript, Python, SQL, Dockerfile, Bash, JSON, etc.) with keyword, type, function, string, comment, and operator colors.
- **Annotated Description Docstring**: Optional header card rendering notes and explanations above the code block.
- **Line Numbers Gutter**: Vertical line number column with subtle divider border.
- **6 Popular IDE Themes**:
  - 🔵 **VS Code Dark**: Official Visual Studio Code Dark+ aesthetic
  - 🟣 **One Dark Pro**: Atom's iconic syntax palette
  - 🧛 **Dracula**: High-contrast vampire palette with neon accents
  - ❄️ **Nord Frost**: Arctic blue and icy dark slate
  - ⚡ **Cyberpunk Neon**: Vivid cyan and purple cyberpunk glow
  - 🌑 **Obsidian Minimal**: Clean, distraction-free monochrome
- **Wallpaper Backdrop Toggle**: Optional soft gradient canvas padding around the floating IDE window with realistic drop shadows.
- **Vector SVG Export**: Download retina-ready, scalable `.svg` image files directly in the browser or copy raw SVG markup to clipboard.

---

## 📡 Embedded REST API Server

DevVault includes a built-in, standalone Node.js HTTP server ([`server/apiServer.mjs`](server/apiServer.mjs)) with **zero external dependencies**. It allows other machines, teammates, or shell terminals to query your command library.

### Enabling the Server

#### Method 1: Inside the Application (1-Click, No CLI Needed)
You can start, stop, and configure the API server directly within DevVault without touching a terminal:
1. Click the **"API Server"** button in the header or **"API Server & Sharing"** in the sidebar.
2. Click **"Enable & Start Server"** (or toggle the power switch).
3. The server immediately binds to your configured port (default `4141`) with real-time status monitoring.
4. Customize port, Bearer API token, or remote write permissions and save with zero server restarts required.
5. In the **Desktop App (Windows, macOS, Linux)**, the server can automatically launch in the background whenever you open DevVault!

#### Method 2: Standalone CLI Execution
For headless servers, SSH sessions, or background daemons:
```bash
# Default mode (port 4141, public endpoints open)
npm run api:start

# Custom port, Bearer token authentication, and write permissions enabled:
node server/apiServer.mjs --port=4141 --api-key=mysecret --allow-write
```

### API Endpoints Reference

| Method | Endpoint | Description | Auth Required? |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | Server health, total counts, and public/private breakdowns | No |
| `GET` | `/api/commands` | List all CLI commands (supports `?platform=linux&category=Git&tag=undo`) | Private only |
| `GET` | `/api/commands/:id` | Fetch specific command by ID | Private only |
| `GET` | `/api/commands/raw/:id` | Raw command string (pipeable to shell) | Private only |
| `POST`| `/api/commands` | Create a new command entry | If writes protected |
| `GET` | `/api/recipes` | List multi-step workflows & recipes (alias `/api/recipies`) | Private only |
| `GET` | `/api/recipes/:id` | Fetch specific recipe by ID | Private only |
| `GET` | `/api/recipes/raw/:id` | Raw recipe script | Private only |
| `POST`| `/api/recipes` | Create a new recipe entry | If writes protected |
| `GET` | `/api/snippets` | List all notebook entries | Private only |
| `GET` | `/api/snippets/search` | Full-text search (`?q=docker&tag=cleanup&category=Docker`) | Private only |
| `GET` | `/api/raw/:id` | Raw snippet content (for `curl ... \| bash`) | Private only |
| `POST`| `/api/snippets` | Create a new snippet | If writes protected |
| `DELETE`| `/api/snippets/:id` | Delete a snippet | Token required |
| `POST`| `/api/import/remote` | Import entries from another DevVault server with deduplication | If writes protected |

### Terminal Quick Recipes

#### 1. Fetch public commands formatted as JSON:
```bash
curl -s http://localhost:4141/api/commands | jq .
```

#### 2. Pipe a command directly into your active shell:
```bash
curl -s http://localhost:4141/api/commands/raw/seed-git-undo-commit | bash
```

> [!WARNING]
> **Terminal Execution Warning**:
> Directly piping remote or uninspected network commands into your shell (`curl ... | bash` or `curl ... | sh`) can be dangerous. It executes scripts immediately with your user account's full shell permissions. Malicious, malformed, or unintended commands can modify critical system files, expose credentials, or result in permanent data loss.
>
> **Safe Practice**: Always inspect the command or script output first before piping it into your shell:
> ```bash
> # Step 1: Inspect the raw script safely
> curl -s http://localhost:4141/api/commands/raw/seed-git-undo-commit
>
> # Step 2: Only execute once you have verified its contents
> curl -s http://localhost:4141/api/commands/raw/seed-git-undo-commit | bash
> ```

#### 3. Search for Docker cleanup commands:
```bash
curl -s "http://localhost:4141/api/snippets/search?q=docker" | jq '.snippets[].title'
```

#### 4. Access private commands with Bearer Token:
```bash
curl -s -H "Authorization: Bearer mysecret" http://localhost:4141/api/commands
```

#### 5. Output raw commands separated by newlines:
```bash
curl -s "http://localhost:4141/api/commands?format=raw"
```

#### 6. Create a new command remotely:
```bash
curl -X POST http://localhost:4141/api/commands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mysecret" \
  -d '{
    "title": "Kill Zombie Node Processes",
    "content": "killall -9 node",
    "category": "System",
    "platform": "linux",
    "tags": ["process", "node"]
  }'
```

#### 7. Remotely trigger an import from another DevVault peer:
```bash
curl -X POST http://localhost:4141/api/import/remote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mysecret" \
  -d '{
    "remoteUrl": "http://192.168.1.100:4141",
    "endpointType": "all"
  }'
```

---

## 🌐 Peer Vault Importer & Strict Deduplication

DevVault allows you to share and collaborate with teammates or sync across multiple workstations by importing commands, recipes, or snippets directly from an external DevVault API server **without creating duplicate entries**.

### 🛡️ 3-Layer Deduplication Engine
When you connect to an external DevVault instance, the importer runs a multi-pass analyzer to protect your database from redundant records:

1. **Exact ID Match**: Identifies records that already share a unique identifier.
2. **Normalized Script Content Match**: Sanitizes line-endings (`\r\n` vs `\n`), trims whitespace, and collapses blank lines. If the underlying shell command or recipe commands match an existing snippet, the importer marks it as a duplicate and reports the existing title (e.g. `Identical script content already exists in 'Undo Last Git Commit'`).
3. **Title & Code Composite Match**: Verifies matching command names and actions.

---

### 💻 Method 1: Interactive In-App Modal
The easiest way to import entries is through the built-in UI:

1. Click **"Import Remote"** in the top navigation bar or the sidebar footer.
2. Enter the remote DevVault API URL (e.g. `http://peer-machine:4141`, `http://192.168.1.50:4141`, or `http://localhost:3000`).
3. Select your resource scope:
   - ⚡ **All Items**: Imports from `/api/snippets`
   - 💻 **Commands Only**: Imports from `/api/commands`
   - 📜 **Recipes Only**: Imports from `/api/recipes`
   - 📝 **Snippets Only**: Imports from `/api/snippets?type=snippet`
4. *(Optional)* Expand **"+ Add Bearer Token"** if the remote server has authentication enabled for private recipes.
5. Tap **"Connect & Scan Remote Vault"** — DevVault connects, queries the endpoint, and groups entries:
   - `✨ NEW`: Items that do not exist in your vault (pre-selected by default).
   - `⚠️ DUPLICATE`: Items that already exist (annotated with match reasons and unselected by default).
6. Filter or search the remote results, toggle **"Strict Deduplication Mode"** (guarantees duplicates are skipped), and tap **"Import Selected Items"**.

---

### ⌨️ Method 2: Standalone CLI Script
Prefer working from the terminal? DevVault includes an automated import script ([`scripts/importFromVault.mjs`](scripts/importFromVault.mjs)):

```bash
# Preview what would be imported (Dry run with duplicate detection)
node scripts/importFromVault.mjs http://localhost:4141 --dry-run

# Import commands only
node scripts/importFromVault.mjs http://192.168.1.50:4141 --type commands

# Import recipes only
node scripts/importFromVault.mjs http://192.168.1.50:4141 --type recipes

# Import with remote Bearer authentication token
node scripts/importFromVault.mjs http://peer-host:4141 --token my-secret-token
```

#### CLI Output Example:
```text
📡 Connecting to DevVault API: http://localhost:4141 (Scope: all)
✔ Found 14 items from remote vault.

------------------------------------------------------
📊 DEDUPLICATION SUMMARY:
   ✨ New items ready to import: 10
   ⚠️  Duplicate items skipped:   4
------------------------------------------------------

Skipped Duplicates:
  - [SKIPPED] "Undo Last Git Commit (Keep Changes)": Identical script content already exists
  - [SKIPPED] "Docker System Prune Deep Clean": Duplicate ID
  - [SKIPPED] "Kubernetes Tail Pod Logs": Identical script content already exists
  - [SKIPPED] "PostgreSQL Dump Single Table": Duplicate title and content

New Items to Import:
  + [NEW] [COMMAND] "Find and Kill Process on Port" (System)
  + [NEW] [RECIPE] "Zero-Downtime Blue/Green Deploy" (DevOps)
  ...

🎉 Successfully imported 10 items into local vault!
```

---

### 📡 Method 3: Automated Server-to-Server API
Trigger synchronization programmatically from CI/CD or another backend:

```bash
curl -X POST http://localhost:4141/api/import/remote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mysecret" \
  -d '{
    "remoteUrl": "http://192.168.1.100:4141",
    "endpointType": "all",
    "token": "remote-server-token"
  }'
```

#### Response:
```json
{
  "message": "Import completed: 10 new items imported, 4 duplicates skipped.",
  "scannedCount": 14,
  "importedCount": 10,
  "duplicatesSkipped": 4,
  "duplicateDetails": [
    { "title": "Undo Last Git Commit", "reason": "Identical script content already exists" }
  ],
  "imported": [ ... ]
}
```

---

## 🧩 Template Parameters

DevVault commands can include interactive dynamic parameters using the `{{...}}` syntax:

```bash
# Simple placeholder
git checkout -b {{BRANCH_NAME}}

# Placeholder with a smart default value
kubectl get secret {{SECRET_NAME:app-secrets}} -n {{NAMESPACE:default}} -o jsonpath="{.data.{{KEY:api_key}}}" | base64 --decode

# Media processing with defaults
ffmpeg -i {{INPUT:input.mp4}} -vf "fps={{FPS:15}},scale={{WIDTH:720}}:-1" {{OUTPUT:output.gif}}
```

When you click **"Fill & Run"** on any card containing parameters:
1. An interactive modal pops up listing every variable with its default value.
2. Type your values and preview the live-interpolated command in real time.
3. Tap **"Fill & Copy"** to copy the ready-to-paste command straight to your clipboard!

---

## ⌨️ Keyboard Shortcuts

Designed for power users who rarely want their fingers to leave the keyboard:

| Shortcut | Action |
| :--- | :--- |
| `/` or `Cmd+K` / `Ctrl+K` | Focus global search box |
| `Cmd+N` / `Ctrl+N` | Open New Entry modal |
| `Esc` | Clear search query / close active modal |
| `Tab` | Accessible keyboard focus navigation |

---

## 📂 Project Architecture

```text
cli-programmer-notebook/
├── App.tsx                          # Root application component & layout shell
├── index.ts                         # Expo root component entrypoint
├── app.json                         # Expo configuration (icons, splash, bundle config)
├── devvault-data.json               # Seed database (14 curated recipes & commands)
├── scripts/
│   └── importFromVault.mjs          # CLI utility to scan and import from remote DevVault
├── server/
│   └── apiServer.mjs                # Zero-dependency embedded Node HTTP API server
└── src/
    ├── components/
    │   ├── Header.tsx               # Search bar, filter pills, sorting, server & import buttons
    │   ├── Sidebar.tsx              # Desktop sidebar & mobile drawer library navigation
    │   ├── SnippetCard.tsx          # Card with badges, visibility toggle, copy counters
    │   ├── SyntaxCodeBlock.tsx      # Token-highlighted code block with line numbers & expand
    │   ├── ParameterFillerModal.tsx # Live {{PARAM}} template interpolation modal
    │   ├── SnippetEditorModal.tsx   # Create / Edit snippet modal with visibility selector
    │   ├── ServerModal.tsx          # Live API server dashboard & curl recipe copy panel
    │   ├── BackupModal.tsx          # Single-click JSON export, import, and backup
    │   ├── TerminalEmulatorModal.tsx # Interactive terminal playback & social card modal
    │   ├── ExternalVaultImportModal.tsx # Remote peer API importer & deduplication review modal
    │   └── TagBadge.tsx             # Interactive filter badge component
    ├── data/
    │   └── seedSnippets.ts          # Default starter dataset (Git, Docker, K8s, Linux, etc.)
    ├── storage/
    │   └── snippetStorage.ts        # Local-first AsyncStorage CRUD & backup persistence
    ├── theme/
    │   ├── colors.ts                # Tokyo Night / Catppuccin terminal color palette
    │   └── injectGlobalWebStyles.ts # Darkmode custom scrollbars & focus ring styling
    ├── types/
    │   ├── snippet.ts               # Core domain models (Snippet, FilterState, Platform)
    │   └── server.ts                # Server configuration and status metrics types
    └── utils/
        ├── searchEngine.ts          # Multi-token scoring and filter logic
        ├── syntaxHighlighter.ts     # Regex tokenizer for Bash, TS, Python, SQL, Dockerfile
        ├── templateParser.ts        # {{PARAM:default}} detection and substitution
        ├── terminalCardFormatter.ts # Unicode ASCII box, markdown, and SVG generator
        ├── vaultImporter.ts         # Remote DevVault fetcher & deduplication comparator
        └── clipboard.ts             # Cross-platform clipboard helper
```

---

## 🔒 Security & Privacy Model

- **Local Storage by Default**: Your snippets never leave your device unless you explicitly run the embedded API server.
- **Granular Visibility**: Each snippet is marked either `🌐 Public` or `🔒 Private`.
- **API Guard**: When the API server is active without an API key, private entries are strictly filtered out (`403 Forbidden`). Providing the configured `--api-key` via `Authorization: Bearer <token>` or `?token=<token>` unlocks private entries.
- **Safe Terminal Execution**: Directly running or piping unverified remote commands into your shell is dangerous. Always inspect command content first before executing scripts with active user permissions.

---

## 🛠️ Verification & Quality

```bash
# Static TypeScript analysis (strict checks, 0 errors)
npm run typecheck

# Check dependency health
npx expo-doctor
```

---

## 📄 License

DevVault is open-source software licensed under the [MIT License](LICENSE). Feel free to fork, customize, and share your own terminal command notebooks!
