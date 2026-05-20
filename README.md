# Chisel Finance

**Cut through debt. Take control of your financial future.**

Chisel is a free Windows desktop app that helps you track every debt you owe, build a personalized payoff plan, and get AI-powered advice — all stored privately on your own computer. No subscriptions, no cloud accounts, no data sharing.

[![Download](https://img.shields.io/badge/Download-Windows%2011-emerald?style=for-the-badge&logo=windows)](https://github.com/sakumow7/Debt-Manager/releases/latest)
[![Version](https://img.shields.io/badge/Version-1.0.3-blue?style=for-the-badge)](https://github.com/sakumow7/Debt-Manager/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

---

## What Chisel does

### Track all your debts in one place
Add credit cards, student loans, auto loans, mortgages, personal loans, and medical debt. See your total balance, minimum payments, and interest rates at a glance on the dashboard.

### Build a payoff plan that actually works
Choose between two proven strategies:

- **Avalanche** — pay off the highest-interest debt first. Saves the most money in interest over time.
- **Snowball** — pay off the smallest balance first. Builds momentum and motivation.

Chisel shows you a month-by-month breakdown of every payment, your exact payoff date, and how much interest you'll save — updated live as you adjust your budget.

### Budget your way to debt freedom
Enter your monthly income and expenses. Chisel calculates your surplus and lets you decide how much extra to put toward debt each month. Small increases in your extra payment can cut years off your payoff timeline.

### Get personalized AI advice
Connect your Anthropic API key and get:

- **Saving Tips** — Claude analyzes your specific debts and spending to surface real opportunities to free up cash.
- **AI Advisor** — a full chat interface where you can ask anything about your financial situation, payoff options, or budgeting strategies. Claude has full context of your debts so the advice is specific to you, not generic.

### Your data stays on your computer
Everything is stored locally. Chisel never sends your financial data to any server. The only outbound connections are when you explicitly use the AI features (which send only what's needed to generate a response).

---

## Getting started

### 1. Download and install

Download the latest `.exe` installer from the [Releases page](https://github.com/sakumow7/Debt-Manager/releases/latest) and run it. Chisel installs like any standard Windows app.

### 2. Add your debts

Click **My Debts** in the sidebar, then **+ Add Debt**. Fill in:

- Debt name (e.g. "Chase Sapphire")
- Creditor / lender
- Type (credit card, student loan, etc.)
- Current balance
- Interest rate (APR %)
- Minimum monthly payment
- Due date

Repeat for every debt you want to track. You can edit or delete any debt at any time.

### 3. Set your attack plan

Click **Attack Plan** and enter your monthly budget — the total amount you can put toward debt each month. Chisel will allocate it across your debts using whichever strategy you choose (Avalanche or Snowball). You'll see:

- Which debt gets paid off first, and when
- Your total payoff date
- Total interest you'll pay vs. what you'd pay making minimums only

Increase the extra monthly payment slider to see how much faster you can get out of debt.

### 4. Track your budget

Click **Budget** to enter your income sources and expense categories. This helps you spot where you have room to put more toward debt.

### 5. Get AI tips (optional)

Go to **Settings** and enter your Anthropic API key (get one free at [console.anthropic.com](https://console.anthropic.com)). Then visit **Saving Tips** or **AI Advisor** to start chatting. Your API key is stored only on your machine and is never shared.

---

## Features at a glance

| Feature | Details |
|---|---|
| Debt types supported | Credit card, student loan, auto, mortgage, personal loan, medical debt |
| Payoff strategies | Avalanche (highest APR first), Snowball (lowest balance first) |
| Charts | Balance over time, payoff timeline, debt breakdown |
| Budget tracker | Income & expense categories, surplus calculation |
| AI saving tips | Personalized suggestions based on your actual debts |
| AI chat advisor | Full conversation with Claude, debt-aware context |
| Data storage | 100% local — no cloud, no account required |
| Platform | Windows 11 |
| Price | Free |

---

## Planned updates

These features are actively in development and coming in the next release:

**v1.1**
- **Net Worth Tracker** — add your assets (savings, investments, property) alongside your debts to see your complete financial picture
- **Balance Transfer Calculator** — model whether a 0% intro APR card would save you money after transfer fees and post-promo rates
- **Biweekly Payment Mode** — switch from monthly to biweekly payments, which effectively adds one extra payment per year and shaves months off your payoff date
- **Credit Score Impact Estimator** — see how your credit card utilization affects your estimated FICO score and what paying down balances would do
- **Light / Dark Mode** — choose whichever theme is easier on your eyes
- **Payoff Celebrations** — a little confetti when you eliminate a debt (you've earned it)
- **Windows Notifications** — optional desktop alerts for upcoming payment due dates

**On the roadmap**
- CSV import to bulk-add debts from a spreadsheet
- Scheduled payment reminders
- Plaid bank connection to auto-sync balances (beta)
- Print / export payoff plan as PDF

---

## Privacy

Chisel stores all your data in your Windows user profile folder using local storage — the same place your browser saves bookmarks. Nothing is uploaded anywhere. If you use the AI features, only the text of your conversation (and debt figures you share) is sent to Anthropic's API; no personally identifying information is included automatically.

---

## Support

Found a bug or have a feature request? [Open an issue](https://github.com/sakumow7/Debt-Manager/issues) on GitHub.

---

## License

MIT — free to use, modify, and distribute.
