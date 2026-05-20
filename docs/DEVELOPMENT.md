# Development Guide

This guide covers everything needed to work on the Debt Manager codebase: environment setup, project conventions, development workflow, and common tasks.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Workflow](#development-workflow)
- [Project Conventions](#project-conventions)
- [Common Development Tasks](#common-development-tasks)
- [Build System](#build-system)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Minimum Version | Install |
|---|---|---|
| Node.js | 18.0.0 | [nodejs.org](https://nodejs.org) |
| npm | 9.0.0 | Included with Node.js |
| Git | 2.0.0 | [git-scm.com](https://git-scm.com) |

Optional but recommended:

| Tool | Purpose |
|---|---|
| VS Code | Editor with TypeScript IntelliSense |
| Electron DevTools | Comes bundled; auto-opens in dev mode |

---

## Environment Setup

```bash
# Clone
git clone https://github.com/sakumow7/Debt-Manager.git
cd Debt-Manager

# Install all dependencies (Electron, React, Vite, TypeScript, etc.)
npm install

# Start development mode
npm run dev
```

On first launch the app window opens. If you want AI features, add an Anthropic API key in Settings.

---

## Development Workflow

### Starting the App

```bash
npm run dev
```

This runs two processes concurrently via `concurrently`:

1. **Vite** (`vite`) — starts HMR dev server at `http://localhost:5173`
2. **Electron** (`wait-on http://localhost:5173 && electron .`) — waits for Vite, then opens the app

The Electron window loads the Vite dev server URL. React HMR is fully functional — changes to renderer code reflect instantly without restarting Electron.

> Changes to `electron/main.ts` or `electron/preload.ts` require a full restart (`Ctrl+C`, `npm run dev`).

### TypeScript Type Checking

```bash
# Check renderer TypeScript
npx tsc --noEmit

# Check Electron TypeScript
npx tsc -p tsconfig.electron.json --noEmit
```

### Building for Production

```bash
# Build renderer + compile Electron
npm run build

# Package as Windows installer
npm run dist:win
```

See [Build System](#build-system) for details.

---

## Project Conventions

### TypeScript

- Strict mode enabled in both `tsconfig.json` and `tsconfig.electron.json`
- Prefer `type` over `interface` for domain models; use `interface` for component props
- All IPC payloads are typed in `src/types/electron.d.ts`
- Domain types live in `src/types/index.ts`

### File Naming

| Context | Convention | Example |
|---|---|---|
| React components | PascalCase `.tsx` | `AttackPlan.tsx` |
| Hooks | camelCase with `use` prefix | `useLocalStorage.ts` |
| Utility modules | camelCase `.ts` | `calculations.ts`, `utils.ts` |
| Type files | camelCase `.ts` | `index.ts`, `electron.d.ts` |
| Documentation | SCREAMING_SNAKE_CASE `.md` | `ARCHITECTURE.md` |

### Component Structure

```tsx
// 1. External imports (React, libraries)
import { useState, useMemo } from 'react';
import { SomeIcon } from 'lucide-react';

// 2. Internal imports (types, lib, hooks, components)
import type { Debt } from '../types';
import { formatCurrency } from '../lib/calculations';
import Modal from '../components/ui/Modal';

// 3. Local type definitions
interface Props {
  debts: Debt[];
  onSave: (debt: Debt) => void;
}

// 4. Sub-components (small, file-local only)
function DebtRow({ debt }: { debt: Debt }) { ... }

// 5. Default export (page or primary component)
export default function MyPage({ debts, onSave }: Props) { ... }
```

### Styling

Tailwind CSS utility classes only — no custom CSS files except `src/index.css` (which contains only base resets and scrollbar styles).

Color palette (from `tailwind.config.js`):
- Background: `gray-950` / `gray-900` / `gray-800`
- Text: `white` / `gray-300` / `gray-400` / `gray-500`
- Primary: `emerald-500` / `emerald-600`
- Danger: `red-500` / `red-400`
- Warning: `amber-500` / `amber-400`
- Info: `blue-500` / `blue-400`

### State Management

- Global state lives in `App.tsx` and is passed as props — no Context API
- Page-local UI state (modals, form inputs) uses `useState`
- Persisted state uses `useLocalStorage` from `src/hooks/useLocalStorage.ts`
- No external state library (Redux, Zustand, Jotai)

### IPC Calls

All IPC interactions are typed via `window.electronAPI` (declared in `src/types/electron.d.ts`). Always guard IPC calls in the renderer with:

```typescript
if (!window.electronAPI) {
  // Gracefully handle browser/test environments
  return;
}
```

---

## Common Development Tasks

### Adding a New Debt Field

1. Add the field to the `Debt` interface in `src/types/index.ts`
2. Update the form state and submit handler in `src/pages/Debts.tsx`
3. Update the debt card display in `src/pages/Debts.tsx`
4. If the field affects calculations, update `src/lib/calculations.ts`

### Adding a New Page

1. Create `src/pages/YourPage.tsx`
2. Add a `<Route>` in `src/App.tsx`
3. Add a nav entry in `src/components/layout/Sidebar.tsx`
4. If the page needs global state, pass it as props from `App.tsx`

### Adding a New IPC Channel

1. Add the handler in `electron/main.ts`:
   ```typescript
   ipcMain.handle('your:channel', async (_, payload) => { ... });
   ```
2. Expose it in `electron/preload.ts`:
   ```typescript
   yourMethod: (arg: Type) => ipcRenderer.invoke('your:channel', arg),
   ```
3. Declare it in `src/types/electron.d.ts`:
   ```typescript
   yourMethod: (arg: Type) => Promise<ReturnType>;
   ```
4. Call from the renderer:
   ```typescript
   const result = await window.electronAPI.yourMethod(arg);
   ```

### Adding a New Chart

Recharts is the charting library. All chart components are composable:

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={240}>
  <LineChart data={data}>
    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151' }} />
    <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} dot={false} />
  </LineChart>
</ResponsiveContainer>
```

---

## Build System

### TypeScript Compilation

The project uses **two separate TypeScript configurations**:

| Config | Target | Module | Output | Used For |
|---|---|---|---|---|
| `tsconfig.json` | ES2020 | ESNext | (bundled by Vite) | Renderer |
| `tsconfig.electron.json` | ES2020 | CommonJS | `electron-dist/` | Main + Preload |

The renderer must use ESNext modules (for Vite tree-shaking). The Electron main process must use CommonJS (Node.js `require`-compatible), which is why they have separate configs.

### Vite Configuration

Key settings in `vite.config.ts`:

```typescript
base: './'     // Required for Electron file:// protocol in production
port: 5173     // Fixed port (Electron waits for this exact URL)
```

### electron-builder Configuration

Packaging configuration is in `package.json` under the `"build"` key:

```json
{
  "appId": "com.debtmanager.app",
  "productName": "Debt Manager",
  "files": ["dist/**", "electron-dist/**", "node_modules/**"],
  "win": {
    "target": [{ "target": "nsis", "arch": ["x64"] }]
  }
}
```

The packager bundles:
- `dist/` — compiled React app
- `electron-dist/` — compiled Electron main/preload
- `node_modules/` — runtime dependencies (`@anthropic-ai/sdk`)

---

## Debugging

### Renderer DevTools

DevTools open automatically in dev mode (see `main.ts: mainWindow.webContents.openDevTools()`).

To open manually at any time: `Ctrl+Shift+I`

### Main Process Logging

`console.log()` in `electron/main.ts` outputs to the **terminal** where `npm run dev` is running, not to the DevTools console.

### Inspecting localStorage

In DevTools → **Application** → **Storage** → **Local Storage** → `http://localhost:5173`

Keys: `dm-debts`, `dm-budgets`, `dm-settings`, `dm-chat`

### Clearing App Data

From within the app: **Settings** → **Clear All Data**

Manually (delete localStorage): DevTools → Application → Local Storage → Right-click → Clear

Manually (delete config.json):
```
Windows: %APPDATA%\Debt Manager\config.json
```

---

## Troubleshooting

### Electron doesn't open after `npm run dev`

- Ensure port 5173 is free (`netstat -an | findstr 5173` on Windows)
- Check that `wait-on` is installed (`npm list wait-on`)
- Look for errors in the terminal from the Vite process

### TypeScript errors after moving files

Run `npx tsc --noEmit` to find all broken import paths. The most common cause is a stale import pointing to the old component location.

### `window.electronAPI is undefined`

This happens when the renderer loads in a standard browser (e.g., `vite preview` or direct HTML open). The context bridge only runs inside Electron. Guard all IPC calls:

```typescript
if (!window.electronAPI) return;
```

### `electron-dist/electron/main.js` not found

Rebuild the Electron TypeScript: `npx tsc -p tsconfig.electron.json`

### API call fails with "No API key configured"

The API key isn't saved. Go to **Settings** → enter key → **Save API Keys**. The key is stored in `%APPDATA%\Debt Manager\config.json`.

### Plaid sandbox `INVALID_CREDENTIALS`

Use the test credentials: username `user_good`, password `pass_good`. Ensure the Plaid environment is set to `sandbox` in Settings.
