# Architecture

This document provides a deep technical reference for the Debt Manager application architecture.

---

## Table of Contents

- [Process Model](#process-model)
- [Module Dependency Graph](#module-dependency-graph)
- [IPC Reference](#ipc-reference)
- [Calculation Engine](#calculation-engine)
- [State Management](#state-management)
- [Storage Strategy](#storage-strategy)
- [Security Model](#security-model)
- [Rendering Pipeline](#rendering-pipeline)

---

## Process Model

Electron splits every application into two isolated operating system processes:

### Main Process (`electron/main.ts`)

- Runs in Node.js — full access to the OS, filesystem, and native modules
- Creates and controls the `BrowserWindow`
- Owns all external network communication (Anthropic API, Plaid API)
- Reads/writes `userData/config.json` for secure API key storage
- Registers `ipcMain.handle()` handlers for all renderer requests
- Windows 11: attempts to apply the Mica background material via `setBackgroundMaterial('mica')`

### Renderer Process (`src/`)

- Runs in a sandboxed Chromium context
- Has no direct Node.js or filesystem access (`nodeIntegration: false`)
- All external calls go through `window.electronAPI` (context bridge)
- Manages all application state via React hooks
- Persists debt/budget data to `localStorage`

### Context Bridge (`electron/preload.ts`)

The preload script runs in the renderer context but has access to Node.js APIs. It is the **only authorized bridge** between the two processes:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  chat:      (messages, systemPrompt) => ipcRenderer.invoke('ai:chat', ...),
  // ...
});
```

The renderer accesses these methods as `window.electronAPI.*`.

---

## Module Dependency Graph

```
src/main.tsx
    └── src/App.tsx
            ├── src/hooks/useLocalStorage.ts          (state persistence)
            ├── src/components/layout/Sidebar.tsx     (navigation)
            └── src/pages/
                    ├── Dashboard.tsx
                    │       ├── src/lib/calculations.ts
                    │       └── src/types/index.ts
                    │
                    ├── Debts.tsx
                    │       ├── src/components/ui/Modal.tsx
                    │       ├── src/lib/calculations.ts
                    │       ├── src/lib/utils.ts
                    │       └── src/types/index.ts
                    │
                    ├── AttackPlan.tsx
                    │       ├── src/lib/calculations.ts
                    │       └── src/types/index.ts
                    │
                    ├── Budget.tsx
                    │       ├── src/lib/utils.ts
                    │       └── src/types/index.ts
                    │
                    ├── Tips.tsx
                    │       ├── src/lib/calculations.ts
                    │       └── src/types/index.ts          ← window.electronAPI.getTips
                    │
                    ├── Chat.tsx
                    │       ├── src/lib/calculations.ts
                    │       ├── src/lib/utils.ts
                    │       └── src/types/index.ts          ← window.electronAPI.chat
                    │
                    └── Settings.tsx
                            └── src/types/index.ts          ← window.electronAPI.getConfig/setConfig
                                                              ← window.electronAPI.plaid*
```

---

## IPC Reference

### Security

- All IPC channels use `ipcMain.handle` (async request-response, not fire-and-forget)
- The renderer cannot invoke any channel not explicitly exposed in `preload.ts`
- API keys are never sent to the renderer — the main process reads them and uses them directly

### Channel Specifications

#### `config:get`

```
Direction : Renderer → Main
Returns   : AppConfig { anthropicKey?, plaidClientId?, plaidSecret?, plaidEnv? }
Side-effects: Reads userData/config.json from disk
```

#### `config:set`

```
Direction : Renderer → Main
Payload   : Partial<AppConfig>
Returns   : true
Side-effects: Writes merged config to userData/config.json
```

#### `ai:chat`

```
Direction : Renderer → Main
Payload   : { messages: {role, content}[], systemPrompt: string }
Returns   : string (assistant message text)
External  : POST https://api.anthropic.com/v1/messages
Model     : claude-sonnet-4-6, max_tokens: 2048
Error     : throws if no API key configured or Anthropic returns an error
```

#### `ai:tips`

```
Direction : Renderer → Main
Payload   : { prompt: string }
Returns   : string (raw Claude response, JSON-parseable by caller)
External  : POST https://api.anthropic.com/v1/messages
Model     : claude-sonnet-4-6, max_tokens: 3000
```

#### `plaid:create-link-token`

```
Direction : Renderer → Main
Returns   : string (Plaid link_token)
External  : POST {plaidEnv}.plaid.com/link/token/create
Products  : ["liabilities", "accounts"]
```

#### `plaid:exchange-token`

```
Direction : Renderer → Main
Payload   : string (public_token from Plaid Link UI)
Returns   : string (access_token)
External  : POST {plaidEnv}.plaid.com/item/public_token/exchange
```

#### `plaid:get-accounts`

```
Direction : Renderer → Main
Payload   : string (access_token)
Returns   : PlaidAccountRaw[]
External  : POST {plaidEnv}.plaid.com/accounts/get
```

#### `plaid:get-liabilities`

```
Direction : Renderer → Main
Payload   : string (access_token)
Returns   : PlaidLiabilitiesResponse { accounts, liabilities: { credit?, student?, mortgage? } }
External  : POST {plaidEnv}.plaid.com/liabilities/get
```

#### `plaid:get-transactions`

```
Direction : Renderer → Main
Payload   : { accessToken, startDate: YYYY-MM-DD, endDate: YYYY-MM-DD }
Returns   : PlaidTransaction[]
External  : POST {plaidEnv}.plaid.com/transactions/get
```

---

## Calculation Engine

The calculation engine in `src/lib/calculations.ts` implements debt amortization by simulation rather than closed-form formulas. This correctly handles variable payments, debt elimination cascades, and mixed debt portfolios.

### `calculatePayoffPlan(debts, extraMonthly, strategy)`

**Algorithm:**

```
Input:
  debts         — array of active debts (balance > 0)
  extraMonthly  — additional $ above all minimums
  strategy      — 'avalanche' | 'snowball' | 'minimum'

Derived:
  totalMinimums  = Σ debt.minimumPayment
  monthlyBudget  = totalMinimums + (strategy === 'minimum' ? 0 : extraMonthly)

Loop (month = 1..600 or until all balances < $0.01):

  Phase 1 — Accrue interest:
    For each active debt (balance > 0.01):
      interest = balance × (APR / 100 / 12)
      balance += interest
      debtState.interestPaid += interest

  Phase 2 — Sort active debts by strategy:
    avalanche : descending APR
    snowball  : ascending balance
    minimum   : no sort (order arbitrary)

  Phase 3 — Distribute budget:
    For each non-target debt (index 1..n):
      payment = min(minimumPayment, balance)
      balance -= payment
      budget  -= payment
    
    For target debt (index 0):
      payment = min(remainingBudget, balance)
      balance -= payment

  Phase 4 — Record payoff events:
    For any debt where balance < 0.01:
      record paidMonth, totalInterestPaid

Output:
  strategy, totalInterestPaid, totalMonths, payoffDate,
  monthlySchedule[], debtPayoffInfo[]
```

**Why simulation over formula?**

The standard amortization formula `P = B₀ × r(1+r)ⁿ / ((1+r)ⁿ - 1)` calculates a fixed payment for a single debt. The attack plan requires modeling cascading payments across multiple debts with varying APRs and changing target allocation — this cannot be expressed in a closed form.

**Complexity**: O(M × N) where M = payoff months (up to 600), N = number of debts. For typical inputs (< 20 debts, < 360 months) this is negligible.

### `getPayoffChartData(plans, samplePoints)`

Samples each strategy's `monthlySchedule` at regular intervals to produce a chart-friendly dataset with `samplePoints` data points per strategy. Always includes month 0 and the final payoff month to ensure accurate endpoints.

---

## State Management

The application uses React's built-in state primitives — no external state library.

### Global State (App.tsx)

```
App
├── debts       : Debt[]          useLocalStorage('dm-debts',    [])
├── budgets     : MonthlyBudget[] useLocalStorage('dm-budgets',  [])
├── settings    : AppSettings     useLocalStorage('dm-settings', DEFAULT_SETTINGS)
└── chatMessages: ChatMessage[]   useLocalStorage('dm-chat',     [])
```

All four pieces of state are initialized from `localStorage` at mount and written back on every update. State is passed as props to page components — no context API or prop drilling beyond one level.

### Local Page State

Each page manages its own ephemeral UI state (form inputs, modal visibility, loading flags) with `useState`. This state is not persisted.

---

## Storage Strategy

### Why localStorage (not a database)?

| Consideration | Decision |
|---|---|
| Data size | Debt records are small; a heavy user might have 20 debts × 200 payments = ~50 KB |
| Offline-first | localStorage is synchronous, always available, no connection required |
| Simplicity | No ORM, migrations, or database file management |
| Electron compatibility | Electron stores `localStorage` in the app's user data directory, so it persists across sessions |
| Privacy | Data never leaves the device without explicit user action |

### localStorage Key Registry

| Key | Type | Description |
|---|---|---|
| `dm-debts` | `Debt[]` | All debt records with payment history |
| `dm-budgets` | `MonthlyBudget[]` | Monthly income and expense records |
| `dm-settings` | `AppSettings` | Strategy, currency, extra payment, Plaid account refs |
| `dm-chat` | `ChatMessage[]` | AI conversation history |

### Secure Config File

API keys are stored outside `localStorage` in a JSON file in Electron's `userData` directory:

```
Windows: %APPDATA%\Debt Manager\config.json
```

The main process reads/writes this file directly. The renderer never sees the raw keys — it only triggers IPC calls that use them.

---

## Security Model

| Threat | Mitigation |
|---|---|
| Renderer accesses Node.js | `nodeIntegration: false` |
| Renderer reads raw API keys | Keys stored in main process only; never passed back over IPC |
| Malicious web content | `contextIsolation: true`; `sandbox: false` only for preload |
| External navigation | `setWindowOpenHandler` blocks new windows; opens in system browser via `shell.openExternal` |
| XSS via AI responses | Content rendered as plain text, not `dangerouslySetInnerHTML` |
| Config file exposure | `userData/config.json` is outside the app directory; not included in package |

---

## Rendering Pipeline

```
Vite dev server / dist/index.html
         │
         ▼
   src/main.tsx
   createRoot(document.getElementById('root'))
         │
         ▼
   src/App.tsx  (HashRouter)
   ├── Shared state hydrated from localStorage
   └── <Routes>
           ├── /              → Dashboard
           ├── /debts         → Debts
           ├── /attack-plan   → AttackPlan
           ├── /budget        → Budget
           ├── /tips          → Tips
           ├── /chat          → Chat
           └── /settings      → Settings
```

**HashRouter** is used instead of BrowserRouter because Electron loads files via the `file://` protocol in production, which does not support HTML5 history-based routing.

**Vite in development** proxies nothing — the renderer connects directly to `http://localhost:5173`. Electron's `loadURL('http://localhost:5173')` is guarded by `app.isPackaged === false`. In production, Electron loads `dist/index.html` directly from disk.
