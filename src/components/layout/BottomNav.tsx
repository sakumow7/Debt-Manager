import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Target, TrendingUp, Settings } from 'lucide-react';

const tabs = [
  { to: '/',           icon: LayoutDashboard, label: 'Home'    },
  { to: '/debts',      icon: CreditCard,      label: 'Debts'   },
  { to: '/attack-plan',icon: Target,          label: 'Plan'    },
  { to: '/net-worth',  icon: TrendingUp,      label: 'Worth'   },
  { to: '/settings',   icon: Settings,        label: 'Settings'},
];

export default function BottomNav() {
  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 px-2 pb-safe"
         style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors text-xs ${
                isActive ? 'text-emerald-400' : 'text-gray-400 active:text-gray-200'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
