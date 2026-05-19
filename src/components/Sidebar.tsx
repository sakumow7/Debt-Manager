import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Target,
  PiggyBank,
  Lightbulb,
  MessageCircle,
  Settings,
  TrendingDown,
} from 'lucide-react';

const nav = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/debts', icon: CreditCard, label: 'My Debts' },
  { path: '/attack-plan', icon: Target, label: 'Attack Plan' },
  { path: '/budget', icon: PiggyBank, label: 'Budget' },
  { path: '/tips', icon: Lightbulb, label: 'Saving Tips' },
  { path: '/chat', icon: MessageCircle, label: 'AI Advisor' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col h-screen shrink-0">
      <div className="px-5 py-6 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <TrendingDown size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Debt Manager</p>
            <p className="text-gray-500 text-xs">Financial Freedom</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-gray-600 text-xs text-center">v1.0.0 — Windows 11</p>
      </div>
    </aside>
  );
}
