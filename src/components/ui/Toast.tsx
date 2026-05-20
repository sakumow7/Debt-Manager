import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ToastItem, ToastType } from '../../hooks/useToast';

const CONFIGS: Record<ToastType, { icon: React.ElementType; bg: string; border: string; iconClass: string; textClass: string }> = {
  success: { icon: CheckCircle,   bg: 'bg-gray-900',    border: 'border-emerald-500/40', iconClass: 'text-emerald-400', textClass: 'text-emerald-200' },
  error:   { icon: AlertCircle,   bg: 'bg-gray-900',    border: 'border-red-500/40',     iconClass: 'text-red-400',     textClass: 'text-red-200'     },
  warning: { icon: AlertTriangle, bg: 'bg-gray-900',    border: 'border-amber-500/40',   iconClass: 'text-amber-400',   textClass: 'text-amber-200'   },
  info:    { icon: Info,          bg: 'bg-gray-900',    border: 'border-blue-500/40',    iconClass: 'text-blue-400',    textClass: 'text-gray-300'    },
};

interface Props {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const cfg = CONFIGS[toast.type];
        const Icon = cfg.icon;
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 ${cfg.bg} border ${cfg.border} rounded-xl px-4 py-3 shadow-2xl min-w-[260px] max-w-[380px] pointer-events-auto animate-toast-in`}
          >
            <Icon size={16} className={`${cfg.iconClass} shrink-0`} />
            <p className={`text-sm flex-1 leading-snug ${cfg.textClass}`}>{toast.message}</p>
            <button
              onClick={() => onRemove(toast.id)}
              className="text-gray-600 hover:text-gray-300 shrink-0 transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
