import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Target,
  PiggyBank,
  Lightbulb,
  MessageCircle,
  Settings,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { ChiselIcon } from '../ui/ChiselIcon';

const nav = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/debts', icon: CreditCard, label: 'My Debts' },
  { path: '/attack-plan', icon: Target, label: 'Attack Plan' },
  { path: '/budget', icon: PiggyBank, label: 'Budget' },
  { path: '/net-worth', icon: TrendingUp, label: 'Net Worth' },
  { path: '/tips', icon: Lightbulb, label: 'Saving Tips' },
  { path: '/chat', icon: MessageCircle, label: 'AI Advisor' },
  { path: '/help', icon: BookOpen, label: 'Help' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800/60 flex flex-col h-screen shrink-0">

      {/* Brand header */}
      <div className="px-5 py-5 border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0">
            <ChiselIcon size={19} className="text-white" accent="white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight tracking-tight">Chisel</p>
            <p className="text-emerald-500/80 text-[10px] uppercase tracking-widest font-medium">
              Cut through debt
            </p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/70'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Version footer */}
      <div className="px-4 py-4 border-t border-gray-800/60">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <ChiselIcon size={11} className="text-gray-600" accent="#6b7280" />
          <p className="text-gray-600 text-xs font-semibold tracking-wide">Chisel</p>
        </div>
        <p className="text-gray-700 text-[10px] text-center">Chisel Finance · v1.1.0</p>
      </div>
    </aside>
  );
}
