/**
 * First-launch onboarding tour.
 *
 * Shown once when no 'dm-onboarding-complete' key exists in localStorage.
 * Walks the user through Chisel's six core concepts so they know exactly
 * where to start. Completing or skipping sets the key so it never reappears
 * unless the user manually replays it from the Help page.
 */
import { useState } from 'react';
import {
  CreditCard, Target, PiggyBank, MessageCircle, CheckCircle2,
  ChevronRight, X, Sparkles, LayoutDashboard,
} from 'lucide-react';
import { ChiselIcon } from './ChiselIcon';

interface Props {
  onComplete: () => void;
}

interface Step {
  icon: React.ElementType | null;
  gradient: string;
  title: string;
  body: string;
  hint?: string;
  isWelcome?: boolean;
  isFinal?: boolean;
}

const STEPS: Step[] = [
  {
    icon: null, // uses ChiselIcon
    gradient: 'from-emerald-400 to-emerald-600',
    title: 'Welcome to Chisel',
    body: 'Chisel is your personal debt payoff tracker. It shows you exactly what you owe, builds a plan to pay it off faster, and helps you save thousands in interest.',
    isWelcome: true,
  },
  {
    icon: CreditCard,
    gradient: 'from-blue-400 to-blue-600',
    title: 'Add Your Debts',
    body: 'Go to My Debts and enter every debt you carry — credit cards, personal loans, auto loans, buy-now-pay-later. Include the balance, interest rate, and minimum payment.',
    hint: 'Tip: You can import a backup file in Settings if you\'re migrating from another tool.',
  },
  {
    icon: Target,
    gradient: 'from-red-400 to-red-600',
    title: 'Choose Your Attack Plan',
    body: 'Chisel runs two payoff strategies side by side. Avalanche targets the highest interest rate first and saves the most money. Snowball targets the smallest balance first for quick motivational wins.',
    hint: 'You can switch strategies any time — it only changes the projection, not your actual debt.',
  },
  {
    icon: PiggyBank,
    gradient: 'from-amber-400 to-amber-600',
    title: 'Build Your Budget',
    body: 'Enter your monthly income and expenses to find your surplus. Chisel can apply that surplus directly to your Attack Plan as an extra monthly payment — even small amounts add up fast.',
    hint: 'Got a tax refund or bonus? Use Extra Income to schedule a one-time lump-sum payment against a specific debt.',
  },
  {
    icon: LayoutDashboard,
    gradient: 'from-violet-400 to-violet-600',
    title: 'Track Your Progress',
    body: 'The Dashboard shows your total debt, monthly payment due, upcoming due dates, and projected debt-free date — all in one glance. Check it regularly to stay motivated.',
    hint: 'Scheduled lump-sum payments appear here so you can apply them when the date arrives.',
  },
  {
    icon: MessageCircle,
    gradient: 'from-purple-400 to-purple-600',
    title: 'Ask Your AI Advisor',
    body: 'The AI Advisor knows your exact debt balances, interest rates, and budget. Ask it anything: "Which debt should I pay first?" or "How much interest will I save if I refinance?"',
    hint: 'Requires an Anthropic API key — add it in Settings → Anthropic Claude API.',
  },
  {
    icon: CheckCircle2,
    gradient: 'from-emerald-400 to-teal-500',
    title: "You're Ready to Chisel!",
    body: "Start by adding your debts, then let Chisel map your path to financial freedom. Every extra dollar you put toward debt today saves you multiple dollars in interest tomorrow.",
    isFinal: true,
  },
];

export default function OnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  function advance() {
    if (isLast) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  function finish() {
    setExiting(true);
    setTimeout(onComplete, 300);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-sm transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={finish}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 transition-colors p-1 z-10"
          title="Skip tutorial"
        >
          <X size={16} />
        </button>

        {/* Hero icon */}
        <div className="pt-10 pb-6 flex flex-col items-center px-8">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${current.gradient} flex items-center justify-center shadow-lg mb-6`}>
            {current.isWelcome ? (
              <ChiselIcon size={36} className="text-white" accent="white" />
            ) : current.icon ? (
              <current.icon size={32} className="text-white" strokeWidth={1.5} />
            ) : null}
          </div>

          {/* Step counter */}
          <div className="flex items-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-5 h-1.5 bg-emerald-400'
                    : i < step
                    ? 'w-1.5 h-1.5 bg-emerald-600/60'
                    : 'w-1.5 h-1.5 bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <h2 className="text-white text-xl font-bold text-center mb-3">{current.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed text-center">{current.body}</p>

          {current.hint && (
            <div className="mt-4 w-full bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <Sparkles size={13} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-gray-400 text-xs leading-relaxed">{current.hint}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center gap-3">
          {!current.isFinal && (
            <button
              onClick={finish}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={advance}
            className={`flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-sm font-semibold transition-colors ${current.isFinal ? 'flex-1' : 'flex-[2]'}`}
          >
            {isLast ? (
              <>
                <CheckCircle2 size={15} /> Start Chiseling
              </>
            ) : (
              <>
                {step === 0 ? "Let's go" : 'Next'}
                <ChevronRight size={15} />
              </>
            )}
          </button>
        </div>

        {/* Step label */}
        {!current.isWelcome && !current.isFinal && (
          <p className="text-center text-gray-700 text-[10px] pb-4 -mt-4">
            {step} of {STEPS.length - 2}
          </p>
        )}
      </div>
    </div>
  );
}
