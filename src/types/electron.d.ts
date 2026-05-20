interface ElectronAPI {
  // Config
  getConfig: () => Promise<{
    anthropicKey?: string;
    plaidClientId?: string;
    plaidSecret?: string;
    plaidEnv?: string;
    plaidAccessTokens?: { institution: string; token: string; accountIds: string[] }[];
  }>;
  setConfig: (updates: Record<string, unknown>) => Promise<boolean>;

  // AI
  chat: (
    messages: { role: string; content: string }[],
    systemPrompt: string
  ) => Promise<string>;
  getTips: (prompt: string) => Promise<string>;

  // Plaid
  plaidCreateLinkToken: () => Promise<string>;
  plaidExchangeToken: (publicToken: string) => Promise<string>;
  plaidGetAccounts: (accessToken: string) => Promise<PlaidAccountRaw[]>;
  plaidGetLiabilities: (accessToken: string) => Promise<PlaidLiabilitiesResponse>;
  plaidGetTransactions: (
    accessToken: string,
    startDate: string,
    endDate: string
  ) => Promise<PlaidTransaction[]>;

  // Notifications
  showNotification?: (title: string, body: string) => Promise<boolean>;
}

interface PlaidAccountRaw {
  account_id: string;
  name: string;
  official_name?: string;
  type: string;
  subtype: string;
  balances: {
    current: number | null;
    available: number | null;
    limit: number | null;
  };
}

interface PlaidLiabilitiesResponse {
  accounts: PlaidAccountRaw[];
  liabilities: {
    credit?: {
      account_id: string;
      aprs: { apr_percentage: number; apr_type: string }[];
      minimum_payment_amount: number;
      last_statement_balance: number;
    }[];
    student?: {
      account_id: string;
      interest_rate_percentage: number;
      minimum_payment_amount: number;
      outstanding_interest_amount: number;
    }[];
    mortgage?: {
      account_id: string;
      interest_rate: { percentage: number };
      next_monthly_payment: number;
    }[];
  };
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category: string[];
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
