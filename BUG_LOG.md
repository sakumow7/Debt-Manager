# Bug & Issue Log — Chisel Finance v1.2.1 Audit

Date: 2026-05-31
Base: v1.2.0 (`main`)
Method: Full static review + simulated user-flow testing of every page +
runtime testing of the financial engine (20/20 assertions passing).

Legend: 🔴 High · 🟠 Medium · 🟡 Low · ✅ Fixed · ⚪ N/A

---

## 🔴 BUG-01 — Credit Score Estimator used original balance as the credit limit
**Page:** My Debts → Credit Score Impact Estimator · **Severity:** High

Utilization was `sum(balance) / sum(originalBalance)`. `originalBalance` is the
balance when the debt was first added — not the card's credit limit — so the
estimate (and its "score impact") was wrong for essentially every user.

**Fix:** Added an optional `creditLimit` field to the `Debt` model + a Credit
Limit input on credit-card forms. The estimator now uses real limits, excludes
cards without one, and shows a call-to-action when none are set. ✅

## 🟠 BUG-03 — "Clear All Data" left chat / scheduled / assets visible
**Page:** Settings → Data Management · **Severity:** Medium

Reset only `debts`/`budgets`/`settings` state and raced with `localStorage.clear()`,
leaving chat history, scheduled payments, and assets on screen until restart.

**Fix:** Clears `localStorage` and reloads for a clean, consistent full reset. ✅

## 🟡 BUG-05 — Payoff comparison chart starting point inflated/duplicated
**Page:** Attack Plan → Balance Over Time · **Severity:** Low

The month-0 anchor reused `plans[0]` for every line and added a full payment on
top of month-1's post-interest balance.

**Fix:** Month 0 is now `schedule[0].totalBalance + totalPayment − totalInterest`
(the true pre-payment start) computed per strategy. ✅

## 🟡 BUG-06 — Wrong ordinal suffixes for due dates 21–31
**Page:** My Debts, Dashboard · **Severity:** Low

`['st','nd','rd'][dueDate-1]` only covered 1–3, so the 21st rendered "21th", etc.

**Fix:** Added an `ordinal()` helper (handles the 11–13 exception) used in both
pages. ✅

## 🟡 BUG-07 — Stale version strings
**Pages:** Sidebar (v1.1.0), Settings (v1.2.0), Help (v1.0.3) · **Severity:** Low

Footers showed three different, outdated versions.

**Fix:** All now read v1.2.1, matching `package.json`. ✅

## 🟠 BUG-09 — Dashboard payoff date ignored Biweekly mode
**Page:** Dashboard vs Attack Plan · **Severity:** Medium

The biweekly "13th payment" bonus lived only in the Attack Plan, so the
Dashboard's Debt-Free Date ignored biweekly and the two screens disagreed.

**Fix:** Extracted a shared `effectiveExtraPayment(debts, extra, biweekly)` helper
used by both the Dashboard and Attack Plan. ✅

---

## ⚪ Already fixed / not applicable on v1.2.0
- **Desktop due-date notifications** — v1.2.0 already ships `lib/reminders.ts`
  with proper once-per-day launch reminders. No change needed.
- **Update Balance increase display** — the Update Balance feature is not part of
  the v1.2.0 codebase, so the related fix does not apply.

## ⚪ Won't fix (by design)
- **Dashboard "monthly surplus" excludes one-time extra income** — intentional: it
  represents recurring monthly surplus; folding in one-time windfalls would
  overstate a "per-month" figure.

---

## Verification
- `npx tsc --noEmit` (renderer) — clean
- `npx tsc -p tsconfig.electron.json` (main process) — clean
- `npx vite build` — succeeds
- Financial engine runtime test — **20/20 assertions passing** (ordinals,
  biweekly math, avalanche optimality + ordering, snowball ordering, underwater
  MAX_MONTHS cap, and the corrected chart anchor).
