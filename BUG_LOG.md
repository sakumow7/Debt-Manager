# Bug & Issue Log — Chisel Finance v1.1.0 Audit

Date: 2026-05-31
Branch: `feature/v1.1`
Method: Full static code review + simulated user-flow testing of every page
(Dashboard, My Debts, Attack Plan, Budget, Net Worth, Tips, Chat, Settings,
Help, Onboarding) and both build pipelines (renderer + Electron main).

Legend: 🔴 High · 🟠 Medium · 🟡 Low · ✅ Fixed · ⚪ Won't fix (by design)

---

## 🔴 BUG-01 — Credit Score Estimator uses original balance as the credit limit
**Page:** My Debts → Credit Score Impact Estimator
**Severity:** High (produces misleading financial numbers)
**Found by:** Reviewing the utilization math.

The estimator computed utilization as `sum(balance) / sum(originalBalance)`.
`originalBalance` is the balance recorded when the debt was first added — **not**
the card's credit limit. A user with a \$2,000 balance on a \$10,000-limit card
would see ~100% utilization (\$2k/\$2k) instead of the real 20%. This makes the
"estimated score impact" wrong for essentially every user.

**Fix:** Added an optional `creditLimit` field to the `Debt` model, surfaced a
"Credit Limit" input in the Add/Edit form (only for credit-card type), and
rewrote the estimator to use real limits. Cards without a limit are excluded
from the calculation, and the panel shows a clear call-to-action when no limits
are set instead of a fabricated number.
**Status:** ✅ Fixed

---

## 🟠 BUG-02 — Desktop notifications never fire for payment due dates
**Page:** Settings → Desktop Notifications / app-wide
**Severity:** Medium (advertised feature was a no-op)
**Found by:** Tracing what `notificationsEnabled` actually triggers.

Enabling notifications stored a flag and sent a single "enabled!" test toast/
notification, but **no code ever checked due dates and notified the user** — the
core promise of the feature. `notificationsEnabled` was written and never read.

**Fix:** Added a throttled due-date reminder in `App.tsx` that runs on launch:
when notifications are enabled (Electron only), it scans for debts due within 3
days and overdue/ready scheduled lump sums, fires one summarizing native
notification, and records the date in `dm-last-due-notify` so it never fires
more than once per day.
**Status:** ✅ Fixed

---

## 🟠 BUG-03 — "Clear All Data" leaves chat / scheduled payments / assets visible
**Page:** Settings → Data Management → Clear All Data
**Severity:** Medium (data appears un-deleted until restart; inconsistent state)
**Found by:** Simulating a full data wipe.

`clearAllData()` only reset `debts`, `budgets`, and `settings` React state, then
called `localStorage.clear()`. Three problems:
1. Chat history, scheduled payments, and the new `dm-assets` were wiped from
   storage but stayed in memory, so they kept rendering until a manual reload.
2. `localStorage.clear()` raced with React's async state-commit writes.
3. The new v1.1 settings keys weren't part of the reset object.

**Fix:** `clearAllData()` now clears `localStorage` and calls
`window.location.reload()`, guaranteeing every hook re-initializes from empty
storage — a clean, consistent full reset.
**Status:** ✅ Fixed

---

## 🟠 BUG-04 — Update Balance increase produces nonsensical "of" display
**Page:** My Debts → Update Balance
**Severity:** Medium (confusing display after a balance increase)
**Found by:** Testing the new Update Balance feature with a higher value.

Setting a balance higher than `originalBalance` (e.g. new charges) showed
"\$1,200 of \$1,000" and pinned the progress bar at 0%, because `originalBalance`
never moved.

**Fix:** When the new balance exceeds the tracked original, `originalBalance` is
raised to match so the "of X" reference and progress percentage stay coherent.
**Status:** ✅ Fixed

---

## 🟡 BUG-05 — Payoff comparison chart starting point is inflated/duplicated
**Page:** Attack Plan → Balance Over Time
**Severity:** Low (minor visual inaccuracy)
**Found by:** Reading `getPayoffChartData`.

The month-0 anchor point for all three strategy lines was computed from
`plans[0]` (Avalanche) for *every* label and added a full payment on top of
month-1's post-interest balance, slightly overstating the start.

**Fix:** Month 0 is now computed exactly per plan as
`schedule[0].totalBalance + totalPayment − totalInterest` (the true pre-payment
starting balance), so all lines start at the correct, identical total.
**Status:** ✅ Fixed

---

## 🟡 BUG-06 — Wrong ordinal suffixes for due dates 21–31
**Page:** My Debts, Dashboard (due-date labels)
**Severity:** Low (cosmetic grammar)
**Found by:** Checking the `['st','nd','rd'][dueDate-1]` lookup.

The lookup only covered days 1–3, so the 21st rendered as "21th", the 22nd as
"22th", 23rd as "23th", 31st as "31th".

**Fix:** Added a shared `ordinal()` helper in `lib/utils.ts` handling the 11–13
exception and all teens correctly; used it in both My Debts and Dashboard.
**Status:** ✅ Fixed

---

## 🟡 BUG-07 — Stale version string and missing features in Help docs
**Page:** Help
**Severity:** Low (documentation drift)
**Found by:** Comparing Help footer to package.json.

Help footer still read "v1.0.3" (now 1.1.0) and the Feature Reference omitted the
new Net Worth tracker.

**Fix:** Bumped the footer to v1.1.0 and added a Net Worth feature card.
**Status:** ✅ Fixed

---

## ⚪ ISSUE-08 — Dashboard "monthly surplus" excludes one-time extra income
**Page:** Dashboard vs Budget
**Severity:** Low (intentional, documented)

The Dashboard surplus banner uses `income − expenses`, while the Budget page's
surplus includes one-time Extra Income. This is **by design**: the Dashboard
figure represents a *recurring monthly* surplus, and folding one-time windfalls
(tax refunds, gifts) into a "per-month" number would overstate recurring cash
flow. Left as-is intentionally.
**Status:** ⚪ Won't fix (by design)

---

## 🟠 BUG-09 — Dashboard payoff date ignores Biweekly mode
**Page:** Dashboard vs Attack Plan
**Severity:** Medium (two screens disagree on the debt-free date)
**Found by:** Tracing the biweekly bonus, which lived only in `AttackPlan.tsx`.

The biweekly "13th payment" bonus was computed inline in the Attack Plan, so the
Dashboard's `bestPlan` (and its Debt-Free Date / total interest) ignored biweekly
mode entirely. Enabling biweekly made the two screens show different payoff dates.

**Fix:** Extracted a shared `effectiveExtraPayment(debts, extra, biweekly)` helper
in `lib/calculations.ts` and used it in **both** the Dashboard and Attack Plan, so
the projection is identical everywhere.
**Status:** ✅ Fixed

---

## Verification
- `npx tsc --noEmit` (renderer) — clean
- `npx tsc -p tsconfig.electron.json` (main process) — clean
- `npx vite build` — succeeds
- **Financial engine runtime test — 28/28 assertions passing**, covering:
  - `ordinal()` for 1–31 incl. the 11–13 exception and the fixed 21st/22nd/23rd/31st
  - `effectiveExtraPayment()` biweekly math (no-biweekly, with-extra, zero-extra)
  - `calculatePayoffPlan()`: avalanche is optimal (least interest, fastest), targets
    highest-APR debt first; snowball targets lowest balance first;
    `monthlyPayment = minimums + extra`; all debts eventually paid
  - Edge cases: empty debt list → 0 months; zero-balance debts filtered out;
    underwater debt (min < interest) caps at MAX_MONTHS=600 (no infinite loop)
  - `getPayoffChartData()` month-0 anchor now equals the true total ($7,000) for
    all three strategy lines (BUG-05 fix confirmed)
