interface ElectronAPI {
  // Config
  getConfig: () => Promise<{
    anthropicKeyConfigured: boolean; plaidSecretConfigured: boolean; plaidClientId?: string; plaidEnv?: string;
    aiConsent: boolean; secureStorageAvailable: boolean; connections: { id: string; accountIds: string[] }[];
  }>;
  setConfig: (updates: Record<string, unknown>) => Promise<boolean>;
  clearConfig: () => Promise<boolean>;

  // AI
  chat: (
    messages: { role: string; content: string }[],
    systemPrompt: string
  ) => Promise<string>;
  getTips: (prompt: string) => Promise<string>;

  // Plaid
  plaidCreateLinkToken: () => Promise<string>;
  plaidExchangeToken: (publicToken: string) => Promise<string>;
  plaidGetAccounts: (connectionId: string) => Promise<PlaidAccountRaw[]>;
  plaidDisconnect: (connectionId: string) => Promise<boolean>;

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

