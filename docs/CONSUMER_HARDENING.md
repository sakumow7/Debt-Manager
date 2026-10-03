# Consumer reliability and security changes

These changes are intended for an unreleased consumer desktop update. They do not
add monetization, accounts, cloud storage, or organizational features.

## Financial behavior

The payoff engine uses integer cents for balances and payments, rounds monthly
APR / 12 interest to cents, pays active minimums first, and assigns remaining funds
by the chosen strategy. Extra funds roll to the next debt in the same month when a
target is cleared. Minimum-only pays each remaining debt its entered minimum and
does not roll freed payments forward. Lump sums are included in schedule totals.

Payoff results include starting and remaining balances and an explicit completion
flag. Unfinished projections have no payoff date; charts, cards and PDF reports
retain outstanding balances. Full-plan savings are compared only when both plans
complete. Month-end payoff dates clamp to the actual last day of the target month.
Biweekly projections remain an annualized approximation, not a lender-specific
payment calendar. Promotional balance-transfer comparisons are unfinished when
either balance remains at the horizon; zero post-promotion APR continues repayment.

Recurring budget capacity excludes one-time income and reserves debt minimums not
already entered under the Debt Payments category. One-time income remains available
for lump sums. Credit utilization is displayed without invented credit-score point
changes. All records use one display currency; selecting another does not perform
foreign-exchange conversion.

## Data model and migration

A validated `chisel-data-v1` localStorage snapshot contains debts, budgets, settings,
assets, chat history, schedules, and onboarding status. Collections are constructed
from allowed fields. Amounts, dates, enums and unique IDs are checked. Orphan
schedules from deleted debts are omitted. Scheduled payment application commits the
balance, payment history and schedule removal together. Removing one-time income
and its pending linked schedules also commits together.

Legacy `dm-*` collections are validated and saved as one snapshot before deletion.
Bank tokens are removed from renderer settings; connections retained in the credential
vault can be matched through account IDs when Settings opens. Some legacy banks may
need reconnection because the original config writer overwrote earlier token lists.
Migration or read failure preserves original storage and shows recovery actions.
Regular writes remain blocked until recovery. Failed storage writes leave the
previous snapshot in memory and on disk and display an error. Backups are versioned,
complete, credential-free JSON; financial content and chat history remain sensitive
and unencrypted. Financial records themselves are not encrypted at rest by this update.

## Desktop security

Credentials are held in `credentials.v1.json`, containing OS-encrypted ciphertext.
Legacy `config.json` is removed only after an encrypted replacement is committed.
Corrupt files are preserved and reported. OS encryption must be available; Linux's
`basic_text` backend is refused. The renderer receives configured-status flags and
opaque banking connection IDs, never saved API keys or bank access tokens.

IPC handlers accept only the trusted window's main frame and expected renderer
origin. Inputs, roles, lengths and environment values are bounded and checked.
Renderer sandboxing and context isolation are enabled; Node integration is disabled.
Unexpected navigation and webviews are blocked. External links require HTTPS without
embedded credentials. Inline JavaScript is removed from CSP; Plaid's script/frame
origin is explicitly permitted. HTTP requests have a 30-second deadline and 2 MB
response limit. Desktop single-instance locking prevents concurrent app instances
from writing the same local records.

AI requires explicit consent enforced in the main process. Financial context uses
numbered debt labels; free-text messages can still contain personal information.
Saved credentials are never included in consumer backups. Bank disconnect calls
Plaid's item-removal endpoint; local credential deletion cannot revoke provider-side
access. Bank sync distinguishes failed connections, preserves unavailable balances,
and rejects non-debt account mappings rather than writing missing balances as zero.

## Verification performed

- `npm test`: 31 regression tests passed on Node 24, including deterministic portfolio
  conservation checks, minimum-only behavior, lump sums, unfinished projections,
  CSV validation, reminders, AI response validation, backup round trips, failed-save
  preservation, corrupt-data recovery, migration, and encrypted credential storage.
- All application TypeScript/TSX files passed syntax transpilation with a temporary
  TypeScript compiler retrieved from the Deno repository through the GitHub connector.
- Application type checks with official React, Node and PapaParse declarations passed.
  Other third-party modules used temporary declarations; those checks do not verify
  their complete API contracts and do not replace the normal project type check.
- Workspace dependency installation was blocked by sandbox networking. Full `npm ci`,
  normal project type checks, Vite build, live UI checks, real Windows DPAPI behavior,
  live Anthropic/Plaid calls, and Windows packaging were not verified locally.

GitHub CI must pass with the real dependencies before these changes are merged.
The initial GitHub write attempt was blocked by integration permissions. A later
retry created the review branch. See the pull request checks for full build results;
the local validation limits above still apply.

## Remaining release requirements

1. Upgrade the locked Electron 28.3.3 runtime to a supported version and regenerate
   the dependency lockfile. Electron 44.5.1 was the latest upstream stable release
   inspected during this work. Do not release this update on the old runtime.
2. Run the full renderer/Electron checks and build with installed dependencies.
3. Verify a Windows installation, the sandboxed preload bridge, OS-encrypted storage,
   legacy migrations, backup/restore, quota errors, reminders and offline use.
4. Verify Plaid Link CSP requirements and item disconnect with sandbox credentials.
   Production Plaid developer secrets should move to a backend before a broadly
   distributed consumer bank-linking service is offered.
5. Sign installers and define a verified update and rollback process. Current
   packaging still disables executable signing; no signing identity was supplied.

The update improves application boundaries and recovery but is not a security
certification or a completed production release.
