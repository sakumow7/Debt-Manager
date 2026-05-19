import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, MessageCircle, AlertCircle } from 'lucide-react';
import type { Debt, ChatMessage, MonthlyBudget } from '../types';
import { generateDebtContext, formatCurrency } from '../lib/calculations';
import { generateId } from '../lib/utils';

interface Props {
  debts: Debt[];
  budgets: MonthlyBudget[];
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[] | ((p: ChatMessage[]) => ChatMessage[])) => void;
}

const QUICK_QUESTIONS = [
  'What\'s the best strategy to pay off my debt?',
  'Should I use avalanche or snowball method?',
  'How do I negotiate a lower interest rate?',
  'Can you create a 12-month payoff plan for me?',
  'What are the best ways to earn extra income?',
  'How do I build an emergency fund while paying debt?',
  'Should I use a balance transfer credit card?',
  'How does debt affect my credit score?',
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-slide-up`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-emerald-600' : 'bg-gray-700'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-emerald-400" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 rounded-tl-sm'}`}>
        <div className="whitespace-pre-wrap">{message.content}</div>
        <p className={`text-xs mt-1.5 ${isUser ? 'text-emerald-200' : 'text-gray-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-emerald-400" />
      </div>
      <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Chat({ debts, budgets, messages, setMessages }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const currentBudget = budgets.find((b) => b.month === new Date().toISOString().slice(0, 7));
  const totalExpenses = currentBudget ? currentBudget.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const debtContext = generateDebtContext(
    debts,
    currentBudget ? { income: currentBudget.income, totalExpenses } : undefined
  );

  const systemPrompt = `You are a compassionate, knowledgeable personal finance advisor specializing in debt elimination and financial freedom. You help people create personalized plans to eliminate debt, save money, and build wealth.

${debtContext}

Guidelines:
- Be encouraging, warm, and non-judgmental
- Give specific, actionable advice referencing their exact debts and numbers
- Explain financial concepts in simple, clear language
- Use the avalanche and snowball debt payoff methods
- Suggest concrete dollar amounts when possible
- Format responses clearly — use bullet points and numbered lists for action steps
- Be realistic about timelines and challenges
- Always emphasize the importance of emergency funds (3-6 months expenses)
- Celebrate progress and milestones
- Keep responses concise but thorough`;

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;

    const userMessage: ChatMessage = { id: generateId(), role: 'user', content: content.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    if (!window.electronAPI) {
      setLoading(false);
      setError('AI chat requires the desktop app. Please run this as an Electron application.');
      return;
    }

    try {
      const history = [...messages, userMessage].slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const response = await window.electronAPI.chat(history, systemPrompt);
      const assistantMessage: ChatMessage = { id: generateId(), role: 'assistant', content: response, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      setError(e.message || 'Failed to get response. Please check your API key in Settings.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-screen p-6 gap-4 animate-fade-in">
      <div>
        <h1 className="text-white text-2xl font-bold">AI Financial Advisor</h1>
        <p className="text-gray-400 text-sm mt-0.5">Personalized debt advice powered by Claude AI</p>
      </div>

      {/* Context Banner */}
      {debts.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 flex items-center gap-2 shrink-0">
          <Bot size={14} className="text-emerald-400" />
          <p className="text-gray-400 text-xs">
            AI has context about your <strong className="text-white">{debts.length} debt{debts.length !== 1 ? 's' : ''}</strong> totaling{' '}
            <strong className="text-white">{formatCurrency(debts.reduce((s, d) => s + d.balance, 0))}</strong>
            {currentBudget && <> and your <strong className="text-white">${currentBudget.income.toLocaleString()}/mo</strong> income</>}
          </p>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-4 overflow-y-auto min-h-0 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4">
              <MessageCircle size={24} className="text-emerald-400" />
            </div>
            <p className="text-gray-300 font-medium mb-1">Your AI Financial Advisor</p>
            <p className="text-gray-500 text-sm text-center max-w-sm">
              Ask me anything about paying off debt, budgeting, saving money, or financial strategies. I have full context about your debts.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-lg">
              {QUICK_QUESTIONS.slice(0, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-300 text-xs transition-colors hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
            {loading && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2 shrink-0">
          <AlertCircle size={14} className="text-red-400" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Quick Questions */}
      {messages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
          {QUICK_QUESTIONS.slice(0, 5).map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="shrink-0 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full px-3 py-1.5 text-gray-300 text-xs transition-colors whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3 shrink-0">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            rows={1}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 resize-none pr-12 placeholder-gray-600"
            placeholder="Ask about your debt strategy, budgeting tips, or anything financial..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ maxHeight: 120 }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="w-10 h-10 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl flex items-center justify-center transition-colors"
              title="Clear chat"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
