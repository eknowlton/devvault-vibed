This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Tooling & Command Execution Reference

> **See [AI_TOOLING.md](file:///home/ethan/projects/cli-programmer-notebook/AI_TOOLING.md) for the complete reference guide.**

### Node.js & PATH Environment
Always export the active Node v26 runtime in non-interactive subshells:
```bash
export PATH="/home/ethan/.nvm/versions/node/v26.10.0/bin:$PATH"
```

### Essential Commands
```bash
npm run test:all            # MANDATORY verification: runs typecheck and all 11 test suites
npm run typecheck           # tsc --noEmit
npm test                    # node tests/runAllTests.mjs
HOME=/tmp npm run build:web # web bundle export (HOME=/tmp avoids sandbox permission errors)
HOME=/tmp npm run lint      # lint code
npm run desktop:dev         # start Electron in development against local Metro dev server
npm run desktop:start       # build web bundle and launch Electron desktop app
npm run build:desktop:dir   # package native desktop directory (release/linux-unpacked)
npm run build:linux         # build Linux packages (AppImage, deb, tar.gz)
npm run build:win           # build Windows packages (nsis, portable, zip)
npm run build:mac           # build macOS packages (dmg, zip)
npm run api:start           # run standalone embedded API server on port 4141
npx expo install <pkg>      # ALWAYS use instead of npm install for Expo/RN packages
```

Run `npm run test:all` before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
