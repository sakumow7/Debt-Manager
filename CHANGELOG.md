# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2024-01-01

### Added

**Core Application**
- Electron 28 desktop shell targeting Windows 11
- Windows 11 Mica background material effect
- Dark theme UI with Tailwind CSS + Recharts visualizations
- Hash-based React Router for Electron `file://` compatibility
- `useLocalStorage` hook for typed persistent state across sessions
- Data export/import (JSON backup) and full data reset

**Dashboard**
- Total debt, projected debt-free date, monthly payment, average APR stat cards
- Payoff timeline area chart using the user's preferred strategy
- Debt breakdown donut pie chart
- Per-debt progress bars with paid-off percentage
- Upcoming payments list with days-until-due countdown
- Surplus detection alert linking to Attack Plan

**Debt Tracker**
- Add, edit, and delete debts (credit card, student loan, mortgage, auto, personal, medical, other)
- Manual payment logging with note and date
- Expandable per-debt payment history
- Balance progress bar (original balance → current balance)
- APR-sorted debt list
- Due-date warning badge (≤ 7 days)

**Attack Plan**
- Avalanche strategy (highest APR first) — minimizes total interest
- Snowball strategy (lowest balance first) — maximizes quick wins
- Minimum-only baseline for comparison
- Extra monthly payment input applied to all strategies simultaneously
- Savings vs minimum metrics (interest saved, months saved)
- Balance over time multi-line chart for all three strategies
- Ordered debt payoff timeline with individual payoff dates and per-debt interest costs
- Persistent strategy selection saved to app settings

**Monthly Budget**
- Monthly income entry
- Expense categories (15 predefined, fixed or variable classification)
- Monthly navigation (past and current months)
- Spending breakdown donut chart
- Budget health bars (expenses % and surplus %)
- One-click "apply 70% of surplus" to Attack Plan extra payment

**Saving Tips**
- 8 curated high-impact tips (always available offline)
- Claude AI tip generation personalized to user's debts and budget
- Expandable action steps for each tip
- Difficulty rating (easy/medium/hard) and category classification
- Potential savings estimate per tip

**AI Financial Advisor**
- Full conversational chat with `claude-sonnet-4-6`
- System prompt includes all debt balances, APRs, and budget context
- Persistent chat history across app restarts
- Quick-question chips for common financial queries
- Typing indicator animation
- Chat clear/reset

**Banking Integration (Plaid)**
- Plaid Link flow: `create-link-token` → user authenticates → `exchange-token` → `get-accounts`
- Automatic debt balance sync from linked accounts
- Liability detail fetch (APR, minimum payment, statement balance) for credit, student, mortgage
- Transaction history retrieval
- Support for sandbox / development / production environments

**Settings**
- Anthropic API key input with live connection test
- Plaid API credentials (Client ID, Secret, environment)
- Step-by-step Plaid setup guide
- Default payoff strategy preference
- Currency display selection (USD, EUR, GBP, CAD, AUD)
- Default extra monthly payment
- JSON backup export and import
- Complete data wipe with confirmation guard

**Security**
- `nodeIntegration: false` + `contextIsolation: true`
- API keys stored in main process only (`userData/config.json`)
- Context Security Policy restricting connect-src to required domains

**Documentation**
- Comprehensive `README.md` with system overview, architecture, feature table, tech stack, project structure
- `docs/ARCHITECTURE.md` — process model, IPC reference, calculation engine, storage strategy, security
- `docs/API_INTEGRATIONS.md` — Anthropic and Plaid setup, request structures, data mapping
- `docs/DEVELOPMENT.md` — dev workflow, conventions, common tasks, build system, debugging
- `CHANGELOG.md`
- `LICENSE` (MIT)

---

[1.0.0]: https://github.com/sakumow7/Debt-Manager/releases/tag/v1.0.0
