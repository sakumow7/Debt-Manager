import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (updates: Record<string, unknown>) => ipcRenderer.invoke('config:set', updates),

  // AI
  chat: (messages: { role: string; content: string }[], systemPrompt: string) =>
    ipcRenderer.invoke('ai:chat', { messages, systemPrompt }),
  getTips: (prompt: string) => ipcRenderer.invoke('ai:tips', { prompt }),

  // Plaid
  plaidCreateLinkToken: () => ipcRenderer.invoke('plaid:create-link-token'),
  plaidExchangeToken: (publicToken: string) => ipcRenderer.invoke('plaid:exchange-token', publicToken),
  plaidGetAccounts: (accessToken: string) => ipcRenderer.invoke('plaid:get-accounts', accessToken),
  plaidGetLiabilities: (accessToken: string) => ipcRenderer.invoke('plaid:get-liabilities', accessToken),
  plaidGetTransactions: (accessToken: string, startDate: string, endDate: string) =>
    ipcRenderer.invoke('plaid:get-transactions', { accessToken, startDate, endDate }),
});
