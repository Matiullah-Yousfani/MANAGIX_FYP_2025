import React from 'react';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';

export type ToastItem = { id: number; message: string; type: 'success' | 'error' };

type Props = {
  toasts: ToastItem[];
};

const ToastStack: React.FC<Props> = ({ toasts }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-8 right-8 z-[70] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`glass px-5 py-4 rounded-2xl flex items-center gap-3 text-sm font-semibold text-slate-800 border-l-4 animate-in slide-in-from-bottom-4 ${
            t.type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'
          }`}
        >
          {t.type === 'success'
            ? <FiCheckCircle size={18} className="text-emerald-500 shrink-0" />
            : <FiXCircle size={18} className="text-red-500 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
};

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const push = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };
  return { toasts, push };
}

export default ToastStack;
