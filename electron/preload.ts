import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (updates: Record<string, unknown>) => ipcRenderer.invoke('config:set', updates),
  clearConfig: () => ipcRenderer.invoke('config:clear'),
  chat: (messages: { role: string; content: string }[], systemPrompt: string) => ipcRenderer.invoke('ai:chat', { messages, systemPrompt }),
  getTips: (prompt: string) => ipcRenderer.invoke('ai:tips', { prompt }),
  plaidCreateLinkToken: () => ipcRenderer.invoke('plaid:create-link-token'),
  plaidExchangeToken: (publicToken: string) => ipcRenderer.invoke('plaid:exchange-token', publicToken),
  plaidGetAccounts: (connectionId: string) => ipcRenderer.invoke('plaid:get-accounts', connectionId),
  plaidDisconnect: (connectionId: string) => ipcRenderer.invoke('plaid:disconnect', connectionId),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notification:show', { title, body }),
});
