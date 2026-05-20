import { useEffect, useMemo } from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';
import { formatCurrency } from '../../lib/calculations';

const CONFETTI_COLORS = ['#10b981', '#34d399', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

function ConfettiParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      x: 5 + Math.random() * 90,
      delay: Math.random() * 1.2,
      duration: 1.6 + Math.random() * 1.4,
      size: 5 + Math.random() * 7,
      isCircle: Math.random() > 0.4,
    })),
  []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  debtName: string;
  originalBalance: number;
  totalPaid: number;
  onClose: () => void;
}

export default function CelebrationModal({ debtName, originalBalance, totalPaid, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 9000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-gray-900 border border-emerald-500/40 rounded-3xl p-8 max-w-sm w-full shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <ConfettiParticles />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 z-10 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-900/30">
            <Trophy size={36} className="text-emerald-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Debt Eliminated!</h2>
          <p className="text-gray-400 text-sm mb-6">
            <span className="text-emerald-400 font-semibold">{debtName}</span> is fully paid off.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-emerald-400 font-bold text-base">{formatCurrency(originalBalance)}</p>
              <p className="text-gray-500 text-xs mt-0.5">Original Balance</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-white font-bold text-base">{formatCurrency(totalPaid)}</p>
              <p className="text-gray-500 text-xs mt-0.5">Total Paid</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-amber-400 mb-5">
            <Sparkles size={14} />
            <p className="text-xs font-medium">Keep chiseling away — you're unstoppable!</p>
            <Sparkles size={14} />
          </div>

          <button
            onClick={onClose}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold transition-colors text-sm"
          >
            Continue the Journey
          </button>
        </div>
      </div>
    </div>
  );
}
