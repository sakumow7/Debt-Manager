# API Integrations

This document covers the two external API integrations: Anthropic Claude and Plaid Banking.

---

## Table of Contents

- [Anthropic Claude API](#anthropic-claude-api)
- [Plaid Banking API](#plaid-banking-api)
- [Adding API Keys in the App](#adding-api-keys-in-the-app)
- [Network Security](#network-security)

---

## Anthropic Claude API

### Purpose

The Claude API powers two features:

| Feature | Page | Description |
|---|---|---|
| AI Financial Advisor | `/chat` | Conversational Q&A with full debt/budget context |
| Personalized Saving Tips | `/tips` | Generates 8 tips tailored to the user's specific situation |

### Model

Both features use `claude-sonnet-4-6` — Anthropic's balanced model offering strong reasoning at reasonable cost.

### Authentication

```
Header: x-api-key: <ANTHROPIC_API_KEY>
Header: anthropic-version: 2023-06-01
```

### Setup

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys** → **Create Key**
3. Copy the key (it is only shown once)
4. Open the Debt Manager app → **Settings** → paste under **Anthropic Claude API**
5. Click **Test** to verify the connection
6. Click **Save API Keys**

### Chat Request Structure

Every message sent to `/chat` includes:

```typescript
{
  model: 'claude-sonnet-4-6',
  max_tokens: 2048,
  system: systemPrompt,   // Includes all debt balances, APRs, budget data
  messages: [             // Last 20 messages from chat history
    { role: 'user', content: '...' },
    { role: 'assistant', content: '...' },
    // ...
  ]
}
```

The system prompt is constructed in `src/lib/calculations.ts` by `generateDebtContext()` and includes:

- Total debt and number of debts
- Each debt: name, creditor, balance, APR, minimum payment
- Monthly income, total expenses, surplus (if budget data exists)

### Tips Request Structure

The tips prompt asks Claude to return a structured JSON object:

```typescript
{
  model: 'claude-sonnet-4-6',
  max_tokens: 3000,
  messages: [{
    role: 'user',
    content: `Return ONLY a JSON object with this structure:
    {
      "tips": [{
        "title": string,
        "description": string,
        "potentialSavings": string,
        "difficulty": "easy" | "medium" | "hard",
        "category": "housing" | "food" | "transportation" | "entertainment" | "utilities" | "income" | "debt" | "other",
        "actionSteps": string[]
      }]
    }`
  }]
}
```

The renderer extracts the JSON block using a regex match: `/\{[\s\S]*\}/`.

### Cost Estimates

| Feature | Typical Tokens | Estimated Cost |
|---|---|---|
| Single chat message | ~1,500–3,000 input + ~500 output | ~$0.005–$0.01 |
| Generate tips | ~800 input + ~1,500 output | ~$0.005–$0.008 |

Pricing: [anthropic.com/pricing](https://www.anthropic.com/pricing)

---

## Plaid Banking API

### Purpose

Plaid connects the app to 12,000+ financial institutions, enabling:

- **Account linking** — user logs into their bank via the Plaid Link UI
- **Balance sync** — fetches real-time account balances to update debt records
- **Liability details** — retrieves APR, minimum payment, and statement balance for credit cards, student loans, and mortgages
- **Transaction history** — fetches recent transactions (optional, for spending analysis)

### Products Used

| Product | API Endpoint | Purpose |
|---|---|---|
| `liabilities` | `/liabilities/get` | Debt-specific details: APR, minimum payments |
| `accounts` | `/accounts/get` | Account balances |
| *(optional)* `transactions` | `/transactions/get` | Spending history |

### Environments

| Environment | Usage | Data |
|---|---|---|
| `sandbox` | Development and testing | Fake test credentials (`user_good` / `pass_good`) |
| `development` | Real accounts, limited institutions | Live bank data (100 items free) |
| `production` | Full deployment | Live bank data, requires Plaid approval |

### Setup

#### Step 1 — Create a Plaid Account

1. Sign up at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Create a new **Application**
   - Category: Personal Finance
   - Environment: Start with Sandbox

#### Step 2 — Get API Credentials

1. Go to **Team Settings** → **Keys**
2. Copy your **Client ID** (same across all environments)
3. Copy your **Sandbox Secret** (environment-specific)

#### Step 3 — Configure in App

1. Open Debt Manager → **Settings** → **Plaid Banking Integration**
2. Enter **Client ID** and **Secret**
3. Select environment (`sandbox` for testing)
4. Click **Save API Keys**
5. Click **Connect Bank**

#### Step 4 — Sandbox Testing

In the Plaid sandbox, use these test credentials:

| Field | Value |
|---|---|
| Username | `user_good` |
| Password | `pass_good` |
| MFA code (if prompted) | `1234` |

### Link Flow

The Plaid Link flow follows OAuth patterns:

```
App requests link_token
         │
         ▼
POST /link/token/create ──► Plaid returns link_token
         │
         ▼
App opens Plaid Link UI (browser window / webview)
         │
         ▼
User selects institution + authenticates
         │
         ▼
Plaid returns public_token (single-use, 30-minute expiry)
         │
         ▼
POST /item/public_token/exchange ──► Plaid returns access_token (permanent)
         │
         ▼
Store access_token → use for GET /accounts/get, /liabilities/get, etc.
```

### Liability Data Mapping

When Plaid returns liability data, it maps to Debt Manager fields as follows:

| Plaid Field | Debt Manager Field | Notes |
|---|---|---|
| `credit[].aprs[].apr_percentage` | `debt.interestRate` | Purchase APR |
| `credit[].minimum_payment_amount` | `debt.minimumPayment` | |
| `credit[].last_statement_balance` | `debt.balance` | |
| `student[].interest_rate_percentage` | `debt.interestRate` | |
| `student[].minimum_payment_amount` | `debt.minimumPayment` | |
| `mortgage[].interest_rate.percentage` | `debt.interestRate` | |
| `mortgage[].next_monthly_payment` | `debt.minimumPayment` | |

### Keeping Access Tokens

Access tokens are stored in `AppSettings.plaidAccounts[]` in localStorage. Each entry:

```typescript
interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  balances: { current: number; available?: number; limit?: number };
  institution: string;
  accessToken: string;    // Never expires unless user revokes or item goes into error state
}
```

> **Note**: Access tokens persist indefinitely unless the institution item enters an error state (e.g., password change). Handle `ITEM_LOGIN_REQUIRED` errors by re-running the Link flow.

### Cost

Plaid pricing varies by product and volume. For personal use and development:

- **Sandbox**: Free
- **Development**: Free up to 100 Items
- **Production**: Per-Item pricing — see [plaid.com/pricing](https://plaid.com/pricing)

---

## Adding API Keys in the App

Both API integrations are configured through the same Settings page:

1. Launch Debt Manager
2. Click **Settings** in the left sidebar
3. In the **Anthropic Claude API** section:
   - Paste your API key
   - Click **Test** to verify
4. In the **Plaid Banking Integration** section:
   - Paste Client ID and Secret
   - Select environment
5. Click **Save API Keys** (bottom of the Settings page)

Keys are written to `{userData}/config.json` by the Electron main process and are never accessible from JavaScript running in the renderer.

---

## Network Security

All external API calls originate in the **Electron main process**, not the renderer. This means:

- The renderer never holds API keys in memory
- No third-party JavaScript (charting libraries, etc.) can intercept keys
- The Content Security Policy in `index.html` restricts `connect-src` to only the required API domains

```
connect-src: 'self'
             https://api.anthropic.com
             https://sandbox.plaid.com
             https://development.plaid.com
             https://production.plaid.com
             https://cdn.plaid.com
```
