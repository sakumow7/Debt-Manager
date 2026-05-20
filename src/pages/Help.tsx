/**
 * Help & Documentation page.
 *
 * Covers the full feature set through five sections: Quick Start guide,
 * Feature Reference, Strategy Explainer, FAQ accordion, and a Financial
 * Glossary. The "Replay Tutorial" button re-triggers the onboarding tour
 * for users who want a refresher.
 */
import { useState } from 'react';
import {
  BookOpen, ChevronDown, ChevronUp, LayoutDashboard, CreditCard,
  Target, PiggyBank, Lightbulb, MessageCircle, Settings,
  Flame, Snowflake, Minus, CheckCircle2, CalendarCheck,
  PlayCircle, HelpCircle, GraduationCap,
} from 'lucide-react';

interface Props {
  onReplayTutorial: () => void;
}

// ─── Quick Start Steps ─────────────────────────────────────────────────────

const QUICK_START = [
  {
    step: 1,
    icon: CreditCard,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    title: 'Add Your Debts',
    desc: 'Go to My Debts and enter every debt — credit cards, loans, BNPL. You need the current balance, interest rate (APR), and minimum payment.',
  },
  {
    step: 2,
    icon: PiggyBank,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Set Up Your Budget',
    desc: 'Enter your monthly take-home income and expenses. Chisel calculates your surplus and can apply it to your Attack Plan automatically.',
  },
  {
    step: 3,
    icon: Target,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    title: 'Review Your Attack Plan',
    desc: 'Compare Avalanche and Snowball strategies. Set an extra monthly payment and see exactly when each debt gets paid off.',
  },
  {
    step: 4,
    icon: LayoutDashboard,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Monitor the Dashboard',
    desc: 'Your home screen shows total debt, next payment due, upcoming due dates, and your projected debt-free date at a glance.',
  },
  {
    step: 5,
    icon: MessageCircle,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    title: 'Ask the AI Advisor',
    desc: 'The AI Advisor knows your full financial picture. Ask for refinancing advice, a sanity check on your strategy, or tips to free up cash.',
  },
];

// ─── Feature Reference ─────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: LayoutDashboard,
    color: 'text-emerald-400',
    title: 'Dashboard',
    summary: 'Your financial command center.',
    bullets: [
      'Total debt remaining, monthly payment, and projected payoff date',
      'Upcoming payment due dates sorted by urgency',
      'Scheduled lump-sum payments with one-click Apply button',
      'Debt breakdown donut chart by creditor',
      'Month-over-month balance trend line',
    ],
  },
  {
    icon: CreditCard,
    color: 'text-blue-400',
    title: 'My Debts',
    summary: 'The source of truth for every debt you carry.',
    bullets: [
      'Add credit cards, personal loans, auto loans, student loans, BNPL',
      'Edit balance, rate, minimum payment, and due date at any time',
      'Log manual payments — balance updates instantly',
      'Each debt gets a color-coded progress bar showing % paid off',
      'Days until next due date shown on each card',
    ],
  },
  {
    icon: Target,
    color: 'text-red-400',
    title: 'Attack Plan',
    summary: 'Month-by-month payoff simulation.',
    bullets: [
      'Avalanche and Snowball strategies calculated in real time',
      'Set an extra monthly payment to see the impact immediately',
      'Balance Over Time chart overlays all three strategies',
      'Payoff Order list shows which debt falls first and when',
      'Monthly Balance Breakdown — expand any debt for a full month-by-month table',
      'Scheduled lump sums are reflected in the projection',
    ],
  },
  {
    icon: PiggyBank,
    color: 'text-amber-400',
    title: 'Budget',
    summary: 'Track income and find money for debt.',
    bullets: [
      'Set monthly income and categorize all expenses',
      'Fixed vs variable expense tagging',
      'Extra Income section for one-time windfalls (tax refunds, bonuses)',
      'Schedule any extra income as a future lump-sum debt payment',
      'Surplus banner with one-click "Apply to Plan" (uses 70% of surplus)',
      'Budget Health bars — Expenses vs Surplus visualized',
    ],
  },
  {
    icon: Lightbulb,
    color: 'text-yellow-400',
    title: 'Saving Tips',
    summary: 'Eight curated tips, or AI-personalized recommendations.',
    bullets: [
      'Eight built-in tips covering debt, housing, food, utilities, and income',
      'Difficulty rating (easy / medium / hard) for each tip',
      'Expandable action steps for every tip',
      '"Generate AI Tips" creates 8 tips tailored to your exact situation',
      'Requires Anthropic API key in Settings',
    ],
  },
  {
    icon: MessageCircle,
    color: 'text-purple-400',
    title: 'AI Advisor',
    summary: 'Ask anything — it knows your full financial picture.',
    bullets: [
      'Full context: every debt, rate, balance, and your monthly budget',
      'Great for: refinancing advice, payoff strategy questions, negotiation scripts',
      'Conversation history kept across sessions',
      'Requires Anthropic API key (add in Settings)',
    ],
  },
];

// ─── FAQ ───────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'What is the difference between Avalanche and Snowball?',
    a: 'Avalanche pays off debts from highest interest rate to lowest. It is mathematically optimal — you pay the least total interest and get debt-free the fastest. Snowball pays the smallest balance first, giving you quick wins that keep motivation high. Both are valid; Avalanche wins on math, Snowball wins on psychology.',
  },
  {
    q: 'What is a lump-sum / scheduled payment?',
    a: 'A lump-sum payment is a one-time extra payment toward a specific debt. In Chisel you can create one from any Extra Income item in Budget → schedule it for today or a future date. It shows up in the Attack Plan projection and on the Dashboard so you can apply it when the money arrives.',
  },
  {
    q: 'How do I add extra money toward a debt without affecting my recurring budget?',
    a: 'Use Budget → Extra Income to log the windfall (e.g. a tax refund). Click Schedule on that item, choose the debt and date, and Chisel creates a pending scheduled payment. It is separate from the regular extra monthly payment slider in Attack Plan.',
  },
  {
    q: 'Will deleting an extra income also remove the scheduled payment?',
    a: 'Yes — as of v1.0.2, deleting an Extra Income item automatically removes any associated scheduled payments, including ones created before the update.',
  },
  {
    q: 'Where is my data stored?',
    a: 'All data is stored locally on your device in the browser\'s localStorage. Nothing is sent to any server. Use Settings → Export Backup regularly to keep a copy of your data.',
  },
  {
    q: 'Does Chisel connect to my bank automatically?',
    a: 'Optional. Chisel supports Plaid banking integration which can sync your live balances. You need a free Plaid developer account and API keys. See Settings → Plaid Banking Integration for setup steps. Without Plaid, you update balances manually.',
  },
  {
    q: 'How do I set up the AI features?',
    a: 'Get a free API key from console.anthropic.com, then enter it in Settings → Anthropic Claude API. Click Save API Keys. The AI Advisor and AI Tips will then work. Your key is stored locally and never leaves your device.',
  },
  {
    q: 'How do I back up or restore my data?',
    a: 'Settings → Data Management → Export Backup saves a JSON file to your Downloads folder. To restore, click Import Backup and select the file. This also works to transfer data to a new PC.',
  },
];

// ─── Glossary ─────────────────────────────────────────────────────────────

const GLOSSARY = [
  { term: 'APR', def: 'Annual Percentage Rate — the yearly interest rate on a debt. Divide by 12 to get the monthly rate.' },
  { term: 'Balance', def: 'The amount you currently owe on a debt, including any accrued interest.' },
  { term: 'Minimum Payment', def: 'The smallest payment a lender accepts each month to keep the account in good standing.' },
  { term: 'Principal', def: 'The original loan amount or the portion of your balance that is not interest.' },
  { term: 'Amortization', def: 'The process of paying off debt through regular payments. Each payment covers interest first, then reduces principal.' },
  { term: 'Debt Avalanche', def: 'A payoff strategy that targets the highest-APR debt first to minimize total interest paid.' },
  { term: 'Debt Snowball', def: 'A payoff strategy that targets the smallest-balance debt first to generate motivational wins.' },
  { term: 'Lump-Sum Payment', def: 'A one-time extra payment that reduces principal immediately, lowering future interest charges.' },
  { term: 'Surplus', def: 'Money left over after subtracting all expenses from total income. This is what you have available for extra debt payments.' },
  { term: 'Debt-Free Date', def: 'The projected month and year when your last debt balance reaches zero, given your current payment plan.' },
];

// ─── Sub-components ────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-800 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3.5 text-left gap-4"
      >
        <span className="text-gray-200 text-sm font-medium">{q}</span>
        {open ? <ChevronUp size={15} className="text-gray-500 shrink-0" /> : <ChevronDown size={15} className="text-gray-500 shrink-0" />}
      </button>
      {open && <p className="text-gray-400 text-sm leading-relaxed pb-4">{a}</p>}
    </div>
  );
}

function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  const [open, setOpen] = useState(false);
  const Icon = feature.icon;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className={feature.color} />
          <div className="text-left">
            <p className="text-white text-sm font-semibold">{feature.title}</p>
            <p className="text-gray-500 text-xs">{feature.summary}</p>
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-gray-800">
          <ul className="mt-3 space-y-1.5">
            {feature.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function Help({ onReplayTutorial }: Props) {
  return (
    <div className="p-6 space-y-8 animate-fade-in max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold flex items-center gap-2">
            <BookOpen size={22} className="text-emerald-400" /> Help & Documentation
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Everything you need to get the most out of Chisel</p>
        </div>
        <button
          onClick={onReplayTutorial}
          className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
        >
          <PlayCircle size={15} /> Replay Tutorial
        </button>
      </div>

      {/* Quick Start */}
      <section>
        <h2 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
          <GraduationCap size={17} className="text-emerald-400" /> Quick Start Guide
        </h2>
        <p className="text-gray-500 text-xs mb-4">Follow these five steps to get fully set up in under 10 minutes.</p>
        <div className="space-y-3">
          {QUICK_START.map(({ step, icon: Icon, color, bg, title, desc }) => (
            <div key={step} className={`flex items-start gap-4 border rounded-2xl p-4 ${bg}`}>
              <div className="w-8 h-8 rounded-xl bg-gray-900/60 flex items-center justify-center shrink-0">
                <Icon size={16} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold ${color}`}>Step {step}</span>
                  <span className="text-white text-sm font-semibold">{title}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Reference */}
      <section>
        <h2 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
          <HelpCircle size={17} className="text-blue-400" /> Feature Reference
        </h2>
        <p className="text-gray-500 text-xs mb-4">Click any feature to see what it does and what each section contains.</p>
        <div className="space-y-2">
          {FEATURES.map((f) => <FeatureCard key={f.title} feature={f} />)}
        </div>
      </section>

      {/* Debt Strategies */}
      <section>
        <h2 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
          <Target size={17} className="text-red-400" /> Debt Payoff Strategies Explained
        </h2>
        <p className="text-gray-500 text-xs mb-4">Chisel supports three modes — here is when to use each.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={16} className="text-red-400" />
              <h3 className="text-red-300 font-semibold text-sm">Avalanche</h3>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">Attacks the debt with the <strong className="text-white">highest APR</strong> first. When it is paid off, that freed-up payment rolls to the next highest rate.</p>
            <div className="space-y-1">
              <p className="text-xs text-emerald-400 font-medium">Best for:</p>
              <p className="text-xs text-gray-500">Minimizing total interest · Getting debt-free fastest · Numbers-focused people</p>
            </div>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Snowflake size={16} className="text-blue-400" />
              <h3 className="text-blue-300 font-semibold text-sm">Snowball</h3>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">Attacks the debt with the <strong className="text-white">smallest balance</strong> first. Each payoff eliminates a payment, freeing up cash for the next debt.</p>
            <div className="space-y-1">
              <p className="text-xs text-blue-400 font-medium">Best for:</p>
              <p className="text-xs text-gray-500">Motivation · Quick wins · People juggling many small debts</p>
            </div>
          </div>
          <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Minus size={16} className="text-gray-400" />
              <h3 className="text-gray-300 font-semibold text-sm">Minimum Only</h3>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">Pays only the <strong className="text-white">minimum required</strong> on every debt. Used as a comparison baseline to show how much the other strategies save.</p>
            <div className="space-y-1">
              <p className="text-xs text-gray-500 font-medium">Used for:</p>
              <p className="text-xs text-gray-500">Seeing the cost of inaction · Motivating yourself to pay more</p>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CalendarCheck size={15} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-emerald-300 text-sm font-semibold">Power Move: Lump-Sum Payments</p>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                Any extra money — tax refund, work bonus, gift — can be scheduled as a one-time lump-sum payment in Budget → Extra Income. Chisel applies it to the simulation at the correct future month so you see its exact impact on your payoff timeline before the money even arrives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
          <HelpCircle size={17} className="text-amber-400" /> Frequently Asked Questions
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 mt-4">
          {FAQ.map((item) => <FAQItem key={item.q} {...item} />)}
        </div>
      </section>

      {/* Glossary */}
      <section>
        <h2 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
          <BookOpen size={17} className="text-gray-400" /> Financial Glossary
        </h2>
        <p className="text-gray-500 text-xs mb-4">Key terms used throughout Chisel.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {GLOSSARY.map(({ term, def }) => (
            <div key={term} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-emerald-400 text-sm font-semibold mb-1">{term}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{def}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-gray-700 text-xs pb-2">
        Chisel Finance v1.0.3 · All data stored locally · <span className="text-gray-600">Never sent to any server</span>
      </div>
    </div>
  );
}
