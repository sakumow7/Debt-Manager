# Debt Manager

> A professional Windows 11 desktop application for tracking debt, building payoff plans, and achieving financial freedom — powered by Claude AI and Plaid banking integration.

[![Build](https://github.com/sakumow7/Debt-Manager/actions/workflows/build.yml/badge.svg)](https://github.com/sakumow7/Debt-Manager/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2011-blue.svg)](https://www.microsoft.com/windows)
[![Electron](https://img.shields.io/badge/Electron-28-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Feature Overview](#feature-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Integrations](#api-integrations)
- [Building for Distribution](#building-for-distribution)
- [Contributing](#contributing)
- [License](#license)

---

## System Overview

Debt Manager is an **Electron-based desktop application** targeting Windows 11. It enables users to:

- **Track** all debts (credit cards, student loans, mortgages, auto loans, personal loans, medical debt) in one unified view
- **Model** debt payoff scenarios using industry-standard Avalanche and Snowball strategies with month-by-month amortization simulation
- **Budget** monthly income and expenses to identify surplus that can be redirected toward debt
- **Connect** bank accounts via Plaid to automatically sync debt balances and transaction history
- **Get personalized advice** from Claude AI (Anthropic) with full knowledge of the user's financial situation
- **Visualize progress** through real-time charts showing payoff timelines, debt breakdowns, and balance trajectories

All data is stored **locally on the user's machine** — no cloud database, no account required. The application only communicates externally when the user explicitly invokes AI or banking features.

---

## Architecture

### Process Model

Electron separates the application into two isolated processes that communicate via IPC (Inter-Process Communication):

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Debt Manager Application                       │
│                                                                       │
│  ┌────────────────────────────┐     ┌───────────────────────────┐   │
│  │      Renderer Process       │     │       Main Process         │   │
│  │   (Chromium + React/Vite)   │     │   (Node.js + Electron)    │   │
│  │                             │     │                            │   │
│  │  ┌──────────────────────┐  │     │  ┌──────────────────────┐ │   │
│  │  │       Pages           │  │     │  │    IPC Handlers       │ │   │
│  │  │  • Dashboard          │  │     │  │  • config:get/set     │ │   │
│  │  │  • Debts              │  │ IPC │  │  • ai:chat            │ │   │
│  │  │  • Attack Plan        │◄─┼─────┼─►│  • ai:tips            │ │   │
│  │  │  • Budget             │  │     │  │  • plaid:link-token   │ │   │
│  │  │  • Saving Tips        │  │     │  │  • plaid:exchange     │ │   │
│  │  │  • AI Chat            │  │     │  │  • plaid:accounts     │ │   │
│  │  │  • Settings           │  │     │  │  • plaid:liabilities  │ │   │
│  │  └──────────────────────┘  │     │  └──────────┬───────────┘ │   │
│  │           │                 │     │             │              │   │
│  │  ┌────────▼───────────┐    │     │  ┌──────────▼───────────┐ │   │
│  │  │   State & Hooks    │    │     │  │   External Services   │ │   │
│  │  │  useLocalStorage   │    │     │  │                       │ │   │
│  │  │  React useState    │    │     │  │  ┌─────────────────┐  │ │   │
│  │  └────────────────────┘    │     │  │  │  Anthropic API  │  │ │   │
│  │           │                 │     │  │  │  claude-sonnet  │  │ │   │
│  │  ┌────────▼───────────┐    │     │  │  └─────────────────┘  │ │   │
│  │  │   Persistence      │    │     │  │                       │ │   │
│  │  │  window.localStorage│    │     │  │  ┌─────────────────┐  │ │   │
│  │  │  (userData dir)    │    │     │  │  │   Plaid API     │  │ │   │
│  │  └────────────────────┘    │     │  │  │  Banking Link   │  │ │   │
│  └────────────────────────────┘     │  │  └─────────────────┘  │ │   │
│                                      │  └──────────────────────┘ │   │
│    ┌──────────────────────┐          │                            │   │
│    │   Context Bridge      │          │  ┌──────────────────────┐ │   │
│    │   (preload.ts)        │◄─────────►│  │  Secure Config File  │ │   │
│    │   window.electronAPI  │          │  │  userData/config.json │ │   │
│    └──────────────────────┘          │  └──────────────────────┘ │   │
│                                      └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### IPC Communication Channels

All renderer-to-main communication is mediated by the context bridge exposed in `electron/preload.ts`. Direct Node.js access from the renderer is disabled (`nodeIntegration: false`, `contextIsolation: true`).

| Channel | Direction | Purpose |
|---|---|---|
| `config:get` | Renderer → Main | Load API keys and saved configuration |
| `config:set` | Renderer → Main | Persist API keys to `userData/config.json` |
| `ai:chat` | Renderer → Main | Proxy message array to Anthropic Messages API |
| `ai:tips` | Renderer → Main | Generate personalized saving tips via Claude |
| `plaid:create-link-token` | Renderer → Main | Create Plaid Link session token |
| `plaid:exchange-token` | Renderer → Main | Exchange public token for access token |
| `plaid:get-accounts` | Renderer → Main | Fetch account balances from Plaid |
| `plaid:get-liabilities` | Renderer → Main | Fetch structured liability details |
| `plaid:get-transactions` | Renderer → Main | Fetch transaction history for a date range |

### Data Flow

```
User Action
    │
    ▼
React Component (page)
    │
    ├── Local data (debts, budget) ──► useLocalStorage hook ──► localStorage
    │
    └── AI / Banking call ──► window.electronAPI ──► IPC ──► Main Process
                                                                   │
                                                         ┌─────────┴─────────┐
                                                         │                   │
                                                    Anthropic API       Plaid API
                                                         │                   │
                                                    AI Response        Account Data
                                                         │                   │
                                                         └─────────┬─────────┘
                                                                   │
                                                             IPC Response
                                                                   │
                                                         React State Update
                                                                   │
                                                             UI Re-render
```

### Debt Calculation Engine (`src/lib/calculations.ts`)

The attack plan calculator runs a **month-by-month amortization simulation** rather than using closed-form formulas. This correctly models the "debt roll" mechanic where a paid-off debt's minimum payment cascades to the next target.

```
Each month:
  1. Accrue interest:  balance += balance × (APR / 12 / 100)
  2. Sort active debts by strategy (avalanche = highest APR first, snowball = lowest balance first)
  3. Pay all non-target debts their minimum payment
  4. Apply remaining budget to target debt
  5. When target reaches $0 → its minimum rolls into the budget for the next target
```

Total monthly budget stays constant: `Σ(minimums) + extraMonthly`. As debts are eliminated, the freed minimums automatically increase the target debt's payment.

### Storage Architecture

| Data | Location | Mechanism |
|---|---|---|
| Debt records | `localStorage["dm-debts"]` | `useLocalStorage` hook |
| Monthly budgets | `localStorage["dm-budgets"]` | `useLocalStorage` hook |
| App settings | `localStorage["dm-settings"]` | `useLocalStorage` hook |
| Chat history | `localStorage["dm-chat"]` | `useLocalStorage` hook |
| API keys | `{userData}/config.json` | Node.js `fs` in main process |

`localStorage` in Electron is stored in the Electron app's user data directory (not the browser's), so it persists across application restarts.

---

## Feature Overview

### Dashboard
Real-time financial health summary with interactive visualizations.

| Component | Description |
|---|---|
| Stat cards | Total debt, projected debt-free date, monthly payment, average APR |
| Payoff timeline | Area chart showing balance reduction over time using the selected strategy |
| Debt breakdown | Donut pie chart segmented by individual debt |
| Progress bars | Per-debt visual indicators showing percentage paid off |
| Upcoming payments | Next 4 payment due dates with days-remaining countdown |
| Surplus alert | Contextual prompt when budget surplus is detected but not applied to debt |

### Debt Tracker
Full CRUD interface for managing individual debts.

| Feature | Description |
|---|---|
| Add/edit debt | Name, creditor, type, balance, APR, minimum payment, due date, notes |
| Payment logging | Record manual payments; history shown in expandable panel |
| Plaid sync | Link a bank account to auto-update balance |
| Progress bar | Gradient bar showing original balance → current balance paid-off ratio |
| Due date alerts | Amber badge when payment is due within 7 days |
| Sort order | Debts sorted by APR (highest first) for at-a-glance prioritization |

### Attack Plan
Side-by-side strategy comparison with mathematical payoff modeling.

| Feature | Description |
|---|---|
| Extra payment input | Single number changes all three strategy calculations instantly |
| Avalanche strategy | Targets highest-APR debt; minimizes total interest paid |
| Snowball strategy | Targets lowest-balance debt; maximizes psychological momentum |
| Minimum only | Baseline scenario showing the cost of minimum payments |
| Comparison metrics | Payoff date, total interest, monthly payment, interest saved vs minimum |
| Balance over time | Multi-line chart overlaying all three strategies on the same axes |
| Payoff order | Ordered list of debts with individual payoff dates and interest paid |

### Monthly Budget
Income and expense tracking to surface money available for debt.

| Feature | Description |
|---|---|
| Monthly navigation | View/edit any past or current month |
| Income input | After-tax take-home pay |
| Expense categories | 15 predefined categories; fixed vs variable classification |
| Spending pie chart | Visual breakdown of expense distribution |
| Budget health bars | Expenses-to-income and surplus-to-income ratio visualizations |
| Auto-apply | One-click sets 70% of monthly surplus as extra debt payment in Attack Plan |

### Saving Tips
AI-powered and curated financial optimization recommendations.

| Feature | Description |
|---|---|
| 8 curated base tips | Always-available tips covering debt, food, entertainment, utilities, income |
| AI personalization | Claude generates 8 tips tailored to the user's specific debts and budget |
| Action steps | Expandable numbered implementation guide for each tip |
| Metadata | Potential savings estimate, difficulty rating (easy/medium/hard), category |

### AI Financial Advisor
Conversational interface with Claude AI, pre-loaded with the user's financial context.

| Feature | Description |
|---|---|
| Context injection | System prompt includes all debts, balances, APRs, and budget data |
| Chat history | Conversations persist in localStorage across app restarts |
| Quick questions | Pre-built question chips for common financial queries |
| Streaming-ready | Architecture supports streaming responses (upgradeable) |
| Context banner | Shows the AI's awareness of current debt totals and income |

### Settings
Application configuration and data management.

| Feature | Description |
|---|---|
| API key management | Secure storage of Anthropic and Plaid keys in `userData/config.json` |
| API key test | Live connection test against the Anthropic API |
| Plaid setup | Step-by-step guide for connecting bank accounts |
| Strategy preference | Default payoff strategy for Dashboard and Attack Plan |
| Currency | Display currency selection (USD, EUR, GBP, CAD, AUD) |
| Data export | Full JSON backup of all debts, budgets, and settings |
| Data import | Restore from a backup file |
| Clear all data | Hard reset with confirmation guard |

---

## Tech Stack

### Application Layer

| Technology | Version | Role |
|---|---|---|
| [Electron](https://electronjs.org) | 28 | Desktop application shell, native OS integration |
| [React](https://react.dev) | 18 | UI component framework |
| [TypeScript](https://typescriptlang.org) | 5 | Type-safe development across all layers |
| [Vite](https://vitejs.dev) | 5 | Renderer bundler and dev server |
| [React Router](https://reactrouter.com) | 6 | Client-side routing (HashRouter for Electron compatibility) |

### UI & Visualization

| Technology | Version | Role |
|---|---|---|
| [Tailwind CSS](https://tailwindcss.com) | 3 | Utility-first styling |
| [Recharts](https://recharts.org) | 2 | Composable chart library (Area, Line, Pie) |
| [Lucide React](https://lucide.dev) | 0.294 | Consistent icon system |

### External Integrations

| Service | SDK | Purpose |
|---|---|---|
| [Anthropic Claude](https://anthropic.com) | Native HTTPS | AI chat and tip generation (`claude-sonnet-4-6`) |
| [Plaid](https://plaid.com) | Native HTTPS | Banking connectivity, balance sync, liabilities |

### Build & Distribution

| Tool | Role |
|---|---|
| [electron-builder](https://electron.build) | Packages app as NSIS Windows installer |
| `tsc` | Compiles Electron main/preload TypeScript to CommonJS |
| `concurrently` + `wait-on` | Orchestrates dev-mode Vite + Electron startup |

---

## Project Structure

```
Debt-Manager/
│
├── .github/
│   └── workflows/
│       └── build.yml              # CI: type-check, build, package
│
├── assets/
│   └── icons/                     # App icons for electron-builder packaging
│
├── build/                         # electron-builder static resources
│
├── docs/
│   ├── ARCHITECTURE.md            # Deep-dive: processes, IPC, data flow
│   ├── API_INTEGRATIONS.md        # Anthropic + Plaid setup and reference
│   └── DEVELOPMENT.md             # Local dev setup, conventions, workflows
│
├── electron/                      # Electron main process (Node.js / CommonJS)
│   ├── main.ts                    # Window creation, IPC handlers, external API calls
│   └── preload.ts                 # Context bridge — exposes window.electronAPI
│
├── src/                           # Renderer process (React / ESM)
│   ├── assets/                    # Static frontend assets (images, fonts)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx        # Primary navigation sidebar
│   │   └── ui/
│   │       └── Modal.tsx          # Reusable modal dialog
│   │
│   ├── hooks/
│   │   └── useLocalStorage.ts     # Typed localStorage persistence hook
│   │
│   ├── lib/
│   │   ├── calculations.ts        # Debt amortization engine, formatters, helpers
│   │   └── utils.ts               # ID generation, date utilities
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx          # Financial overview, charts, upcoming payments
│   │   ├── Debts.tsx              # Debt CRUD, payment logging, progress tracking
│   │   ├── AttackPlan.tsx         # Avalanche / Snowball / Minimum strategy comparison
│   │   ├── Budget.tsx             # Monthly income, expense tracking, surplus calc
│   │   ├── Tips.tsx               # Curated + AI-personalized saving tips
│   │   ├── Chat.tsx               # AI financial advisor chat interface
│   │   └── Settings.tsx           # API keys, Plaid, preferences, data management
│   │
│   ├── types/
│   │   ├── index.ts               # All domain types: Debt, Budget, AttackPlanResult…
│   │   └── electron.d.ts          # window.electronAPI type declaration
│   │
│   ├── App.tsx                    # Root component: router, shared state, layout
│   ├── index.css                  # Tailwind directives + scrollbar styles
│   └── main.tsx                   # React DOM entry point
│
├── .env.example                   # Environment variable template
├── .gitignore
├── CHANGELOG.md
├── index.html                     # Vite HTML entry point
├── LICENSE
├── package.json                   # Dependencies, scripts, electron-builder config
├── postcss.config.js
├── README.md
├── tailwind.config.js
├── tsconfig.json                  # Renderer TypeScript config (ESNext, bundler resolution)
├── tsconfig.electron.json         # Electron TypeScript config (CommonJS, Node resolution)
└── vite.config.ts                 # Vite config (base: './', port: 5173)
```

---

## Getting Started

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |
| Operating System | Windows 10/11 (for full feature set) |

> The development server also runs on macOS/Linux. Only packaging and some Windows-specific features (Mica effect) require Windows.

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/sakumow7/Debt-Manager.git
cd Debt-Manager

# 2. Install dependencies
npm install

# 3. (Optional) Copy environment template
cp .env.example .env
```

### Development

```bash
# Start Vite dev server + Electron simultaneously
npm run dev
```

This runs two processes in parallel:
1. **Vite** on `http://localhost:5173` with hot module replacement
2. **Electron** waits for Vite to be ready, then opens the app window

> The app loads `http://localhost:5173` in dev mode. On first launch, go to **Settings** and add your [Anthropic API key](#anthropic-claude-api) to enable AI features.

---

## Configuration

### API Keys

All API keys are stored securely in Electron's `userData` directory (never in the repository):

- **Windows**: `%APPDATA%\Debt Manager\config.json`

Keys are configured through the in-app **Settings** page. They are passed to the Electron main process via IPC and never exposed to the renderer.

See [docs/API_INTEGRATIONS.md](docs/API_INTEGRATIONS.md) for detailed setup guides.

### App Settings (localStorage)

User preferences are stored in `localStorage["dm-settings"]`:

```typescript
interface AppSettings {
  extraMonthlyPayment: number;      // Extra $ applied toward debt monthly
  currency: string;                  // Display currency (default: "USD")
  preferredStrategy: 'avalanche' | 'snowball';
  plaidAccounts: PlaidAccount[];    // Linked bank accounts
}
```

---

## API Integrations

### Anthropic Claude API

Used for: **AI Chat** (`/chat` page) and **personalized Saving Tips** (`/tips` page).

- **Model**: `claude-sonnet-4-6`
- **Auth**: API key stored in `userData/config.json`, sent via `x-api-key` header
- **Communication**: Main process makes direct HTTPS calls via Node.js `https` module

Get your API key at [console.anthropic.com](https://console.anthropic.com).

### Plaid Banking API

Used for: **bank account linking** and **automatic debt balance sync**.

- **Products**: `liabilities`, `accounts`
- **Environments**: `sandbox` (testing) → `development` → `production`
- **Auth**: Client ID + Secret stored in `userData/config.json`
- **Communication**: Main process makes direct HTTPS calls to Plaid's REST API

Get your credentials at [dashboard.plaid.com](https://dashboard.plaid.com).

See [docs/API_INTEGRATIONS.md](docs/API_INTEGRATIONS.md) for the complete integration guide.

---

## Building for Distribution

```bash
# Build React app + compile Electron TypeScript
npm run build

# Package as Windows NSIS installer (outputs to /release)
npm run dist:win
```

The packaged output is a `.exe` NSIS installer in the `release/` directory. It supports:
- Custom install directory selection
- Start menu shortcut
- Clean uninstaller

> **Note**: Place a 256×256 `icon.ico` in the `build/` directory before packaging to use a custom app icon.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for development conventions and workflow details.

---

## License

[MIT](LICENSE) © 2024 Debt Manager Contributors
