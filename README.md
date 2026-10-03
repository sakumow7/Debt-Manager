# Chisel Finance

**Cut through debt. Build a plan you can understand and track.**

Chisel is a Windows desktop application for personal debt tracking, budgeting,
net worth tracking, and estimated payoff planning. Core features work offline
without an account. Optional AI and banking integrations contact their providers.

[Download the latest released installer](https://github.com/sakumow7/Debt-Manager/releases/latest)
· [Report an issue](https://github.com/sakumow7/Debt-Manager/issues)
· [MIT license](LICENSE)

The consumer hardening changes on this branch are unreleased. See
[validation and remaining release requirements](docs/CONSUMER_HARDENING.md)
before building or distributing a new installer.

## Features

- Track debt balances, APRs, minimum payments, due days, and recorded payments.
- Compare avalanche, snowball, and minimum-only payoff estimates.
- Model additional monthly payments and planned lump sums.
- Track recurring income, expenses, one-time income, and assets.
- Import debts from CSV; export payoff reports as PDF.
- Export and restore complete JSON backups.
- Receive payment reminders while the desktop application is running.
- Use optional Anthropic AI tips and chat with explicit data-sharing consent.
- Use the experimental Plaid developer integration to retrieve bank balances.

Recorded and scheduled payments are bookkeeping entries. To make a payment,
use your bank or lender. Payoff estimates assume fixed entered APRs and minimums,
monthly interest at APR / 12, and rounding to cents. Actual lender statements may
differ. A plan that does not reach zero within the projection is shown as unfinished.
Biweekly mode averages an additional annual payment across months; it requires
additional annual funds.

## Privacy and recovery

Financial records remain in local application storage unless you export them or
choose a third-party integration. Financial records and JSON backups are not
encrypted by Chisel; protect your device and backup files.

API credentials and bank access tokens are encrypted using Electron's OS-backed
credential storage. Saved secrets are not returned to the UI and do not appear in
ordinary backups. Storage refuses an insecure plaintext fallback. Legacy
plaintext credentials migrate when secure storage is available; migration failures
preserve the original file for recovery.

When you enable and use AI, debt figures, budget information, and your messages
are sent to Anthropic. Debt names and creditors use numbered labels. Avoid personal
information in messages. Provider terms and API charges apply. You can withdraw
consent in Settings. AI guidance may be inaccurate; verify decisions with lender
statements and appropriate professional guidance.

Backups include debts, budgets, assets, scheduled payments, settings, chat history,
and onboarding status. Credentials and bank connections are excluded. Reconnect
banks after restoring. Older backups can be imported but cannot recover collections
that their original export omitted. Restore validates the entire file before
replacing financial records. Failed saves are reported; unreadable records enter
recovery mode rather than being silently discarded.

Disconnect banks to revoke their access with Plaid. Removing local credentials or
clearing local data removes local tokens; it does not revoke access at the provider.
Reminders require Chisel to be running.

## Development

Use Node.js 24 LTS. The dependency-free regression suite can run before installing
packages:

```sh
npm test
npm ci
npm run typecheck
npm run build
npm run dev
```

Create Windows packages with `npm run dist:win` on a suitable build machine.
CI runs the regression suite, renderer and Electron type checks, and the renderer
build. Release builds run regression tests and type checks before packaging.

See [architecture](docs/ARCHITECTURE.md), [development](docs/DEVELOPMENT.md),
and [consumer hardening](docs/CONSUMER_HARDENING.md). Older architecture and
integration examples are superseded by the hardening document where they differ.
