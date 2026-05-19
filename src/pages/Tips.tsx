import { useState } from 'react';
import { Lightbulb, RefreshCw, Home, Utensils, Car, Tv, Zap, TrendingUp, DollarSign, HelpCircle, Star } from 'lucide-react';
import type { Debt, MonthlyBudget } from '../types';
import type { SavingsTip } from '../types';
import { formatCurrency } from '../lib/calculations';

interface Props {
  debts: Debt[];
  budgets: MonthlyBudget[];
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  housing: Home,
  food: Utensils,
  transportation: Car,
  entertainment: Tv,
  utilities: Zap,
  income: TrendingUp,
  debt: DollarSign,
  other: HelpCircle,
};

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  hard: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const STATIC_TIPS: SavingsTip[] = [
  {
    title: 'Use the Debt Avalanche Method',
    description: 'Focus extra payments on your highest interest debt first. This minimizes total interest paid and gets you debt-free faster.',
    potentialSavings: '$500-$5,000+ in interest',
    difficulty: 'easy',
    category: 'debt',
    actionSteps: ['List debts by interest rate (highest first)', 'Pay minimums on all others', 'Put every extra dollar toward highest-rate debt', 'When paid, roll that payment to next highest'],
  },
  {
    title: 'Negotiate Lower Interest Rates',
    description: 'Call your credit card companies and ask for a lower APR. If you have a good payment history, many will reduce your rate.',
    potentialSavings: '2-5% rate reduction',
    difficulty: 'easy',
    category: 'debt',
    actionSteps: ['Check your credit score first', 'Call the number on the back of your card', 'Mention your on-time payment history', 'Ask for a rate reduction or 0% balance transfer'],
  },
  {
    title: 'Cancel Unused Subscriptions',
    description: 'The average household has 12+ subscriptions. Audit all recurring charges and cancel what you don\'t actively use.',
    potentialSavings: '$50-$300/month',
    difficulty: 'easy',
    category: 'entertainment',
    actionSteps: ['Check bank statements for recurring charges', 'Use apps like Rocket Money to find subscriptions', 'Cancel any you haven\'t used in 30 days', 'Keep only 2-3 streaming services at a time'],
  },
  {
    title: 'Meal Prep and Cook at Home',
    description: 'Eating out costs 3-5x more than cooking at home. Meal prepping on weekends saves both money and time during the week.',
    potentialSavings: '$200-$600/month',
    difficulty: 'medium',
    category: 'food',
    actionSteps: ['Plan meals for the week on Sunday', 'Shop with a grocery list (no impulse buys)', 'Prep ingredients or full meals in batches', 'Bring lunch to work instead of buying'],
  },
  {
    title: 'Refinance High-Interest Debt',
    description: 'Consolidate multiple high-interest debts into a lower-rate personal loan or 0% balance transfer card.',
    potentialSavings: '5-15% interest reduction',
    difficulty: 'medium',
    category: 'debt',
    actionSteps: ['Check your credit score (aim for 670+)', 'Compare personal loan rates online', 'Look for 0% balance transfer credit cards', 'Factor in transfer fees (typically 3-5%)'],
  },
  {
    title: 'Automate Savings and Payments',
    description: 'Set up automatic payments for minimums and automatic transfers to a debt payoff account. What you don\'t see, you won\'t spend.',
    potentialSavings: 'Prevents late fees + compounds progress',
    difficulty: 'easy',
    category: 'debt',
    actionSteps: ['Set up autopay for all minimum payments', 'Create a separate "debt slayer" savings account', 'Auto-transfer $X after each paycheck', 'Review and increase transfer amount quarterly'],
  },
  {
    title: 'Side Hustle for Extra Income',
    description: 'Even $200-500/month from a side gig applied entirely to debt can cut years off your payoff timeline.',
    potentialSavings: '$200-$1,000+/month extra',
    difficulty: 'hard',
    category: 'income',
    actionSteps: ['List your skills (writing, coding, design, teaching)', 'Sign up on Fiverr, Upwork, or TaskRabbit', 'Start with 5-10 hrs/week', 'Apply 100% of side income to debt'],
  },
  {
    title: 'Lower Your Utility Bills',
    description: 'Small changes in energy usage can save $50-150/month on utilities that can go directly toward debt.',
    potentialSavings: '$50-$150/month',
    difficulty: 'easy',
    category: 'utilities',
    actionSteps: ['Install a programmable thermostat', 'Unplug electronics when not in use', 'Switch to LED bulbs throughout the home', 'Call provider to ask about cheaper plans'],
  },
];

function TipCard({ tip, index }: { tip: SavingsTip; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = CATEGORY_ICONS[tip.category] || HelpCircle;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
          <Icon size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-white font-semibold text-sm">{tip.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLORS[tip.difficulty]}`}>
                {tip.difficulty}
              </span>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">{tip.description}</p>
          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
              <Star size={11} fill="currentColor" />
              <span>{tip.potentialSavings}</span>
            </div>
            <span className="text-gray-700">·</span>
            <span className="text-gray-500 text-xs capitalize">{tip.category.replace('_', ' ')}</span>
          </div>
          {tip.actionSteps && (
            <>
              <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                {expanded ? 'Hide steps' : 'Show action steps'}
              </button>
              {expanded && (
                <ol className="mt-2 space-y-1 pl-4">
                  {tip.actionSteps.map((step, i) => (
                    <li key={i} className="text-gray-400 text-xs list-decimal">{step}</li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Tips({ debts, budgets }: Props) {
  const [tips, setTips] = useState<SavingsTip[]>(STATIC_TIPS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const currentBudget = budgets.find((b) => b.month === new Date().toISOString().slice(0, 7));
  const totalExpenses = currentBudget ? currentBudget.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const surplus = currentBudget ? currentBudget.income - totalExpenses : 0;

  async function generateAITips() {
    if (!window.electronAPI) {
      setError('AI tips require the desktop app. Using curated tips instead.');
      return;
    }
    setLoading(true);
    setError('');

    const prompt = `I need 8 personalized money-saving tips for someone with the following financial situation:

${debts.length > 0 ? `Debts:
${debts.map((d) => `- ${d.name}: $${d.balance.toLocaleString()} at ${d.interestRate}% APR, $${d.minimumPayment}/mo minimum`).join('\n')}
Total debt: $${totalDebt.toLocaleString()}` : 'No debts entered yet, assume typical debt situation.'}

${currentBudget ? `Monthly Budget:
- Income: $${currentBudget.income.toLocaleString()}
- Expenses: $${totalExpenses.toLocaleString()}
- Surplus/Deficit: $${surplus.toLocaleString()}
- Expense categories: ${currentBudget.expenses.map((e) => `${e.category} $${e.amount}`).join(', ')}` : ''}

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "tips": [
    {
      "title": "Short title",
      "description": "2-3 sentence explanation specific to their situation",
      "potentialSavings": "e.g. $150/month or 3% interest reduction",
      "difficulty": "easy",
      "category": "debt",
      "actionSteps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}

Categories must be one of: housing, food, transportation, entertainment, utilities, income, debt, other
Difficulty must be: easy, medium, or hard
Make tips highly specific to their situation. Prioritize highest-impact actions.`;

    try {
      const raw = await window.electronAPI.getTips(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response format');
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tips && Array.isArray(parsed.tips)) {
        setTips(parsed.tips);
        setAiGenerated(true);
      } else {
        throw new Error('Invalid tips format');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate AI tips. Showing curated tips.');
      setTips(STATIC_TIPS);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Money Saving Tips</h1>
          <p className="text-gray-400 text-sm mt-0.5">Personalized strategies to free up cash for debt payoff</p>
        </div>
        <button
          onClick={generateAITips}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Generating...' : aiGenerated ? 'Refresh AI Tips' : 'Generate AI Tips'}
        </button>
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-300 text-sm">
          {error}
        </div>
      )}

      {aiGenerated && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Lightbulb size={15} className="text-emerald-400" />
          <p className="text-emerald-300 text-sm">These tips were personalized by AI based on your specific debt situation and budget.</p>
        </div>
      )}

      {debts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-red-400 font-bold">{formatCurrency(totalDebt)}</p>
            <p className="text-gray-500 text-xs">Total Debt</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className={`font-bold ${surplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(surplus)}</p>
            <p className="text-gray-500 text-xs">Monthly Surplus</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-amber-400 font-bold">{debts.length > 0 ? `${(debts.reduce((s, d) => s + d.interestRate, 0) / debts.length).toFixed(1)}%` : '—'}</p>
            <p className="text-gray-500 text-xs">Avg. Interest Rate</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tips.map((tip, i) => <TipCard key={`${tip.title}-${i}`} tip={tip} index={i} />)}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold mb-3">The #1 Rule for Getting Out of Debt</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">Spend less than you earn, and put the difference toward your highest-interest debt.</strong> Every dollar of extra payment reduces your principal, which reduces the interest you'll pay next month. This compounding effect means early extra payments have an outsized impact on your total payoff time and interest costs.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[['$100/mo extra', 'Saves $2,000–$10,000 in interest'], ['Pay biweekly', 'Makes 26 half-payments = 13 full payments/year'], ['Round up payments', 'Adding $20-50 to each payment accelerates payoff']].map(([t, d]) => (
            <div key={t} className="bg-gray-800 rounded-xl p-3">
              <p className="text-emerald-400 text-sm font-semibold">{t}</p>
              <p className="text-gray-500 text-xs mt-1">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
