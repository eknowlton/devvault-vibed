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

[Features](#-key-features) • [Quick Start](#-quick-start) • [API Server](#-embedded-rest-api-server) • [Template Parameters](#-template-parameters) • [Keyboard Shortcuts](#-keyboard-shortcuts) • [Architecture](#-project-architecture)

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

#### Mobile (iOS / Android / Expo Go):
```bash
# Start the Metro bundler with QR code for Expo Go:
npm start

# Or directly target simulators:
npm run ios      # iOS Simulator (macOS)
npm run android  # Android Emulator
```

---

## 📡 Embedded REST API Server

DevVault includes a built-in, standalone Node.js HTTP server ([`server/apiServer.mjs`](server/apiServer.mjs)) with **zero external dependencies**. It allows other machines, teammates, or shell terminals to query your command library.

### Starting the Server
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

### Terminal Quick Recipes

#### 1. Fetch public commands formatted as JSON:
```bash
curl -s http://localhost:4141/api/commands | jq .
```

#### 2. Pipe a command directly into your active shell:
```bash
curl -s http://localhost:4141/api/commands/raw/seed-git-undo-commit | bash
```

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

#### 6. Remotely trigger an import from another DevVault peer:
```bash
curl -X POST http://localhost:4141/api/import/remote \
  -H "Content-Type: application/json" \
  -d '{"remoteUrl": "http://192.168.1.100:4141", "endpointType": "all"}'
```

---

## 🌐 Peer Vault Importer & Strict Deduplication

DevVault allows you to share and collaborate with other developers by importing their commands, recipes, or snippets directly from their running DevVault API server without polluting your database with duplicate items.

### 🛡️ How Deduplication Works
Every incoming item is evaluated through a multi-pass deduplication comparison:
1. **Exact ID Match**: Prevents duplicate records with identical IDs.
2. **Normalized Code Match**: Compares the clean script content (stripping carriage returns, blank lines, and whitespace variance). If an identical command already exists in your vault, it is flagged with a note linking the existing entry.
3. **Title + Content Match**: Verifies matching command names and actions.

### 💻 Using the In-App Modal
1. Tap **"Import Remote"** in the top navigation bar or sidebar footer.
2. Enter the remote DevVault API URL (e.g. `http://peer-machine:4141` or `http://localhost:3000`).
3. Select resource scope: **All Items**, **Commands Only**, **Recipes Only**, or **Snippets Only**.
4. (Optional) Enter a Bearer token if the remote vault has enabled authentication for private recipes.
5. Tap **"Connect & Scan Remote Vault"** — DevVault fetches the entries and groups them into `✨ NEW` vs `⚠️ DUPLICATE`.
6. Select the items you want (or tap **"Select New"**) and click **"Import Selected Items"** to merge them cleanly into your vault.

### ⌨️ Using the CLI Script
You can also import directly from your shell without opening the UI:
```bash
# Preview what would be imported (Dry run)
node scripts/importFromVault.mjs http://localhost:4141 --dry-run

# Import commands only
node scripts/importFromVault.mjs http://localhost:4141 --type commands

# Import with remote authentication token
node scripts/importFromVault.mjs http://peer-host:4141 --token secret-token
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
