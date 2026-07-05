import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';

type ToastType = 'success' | 'error' | 'info';
type Item = { id: number; message: string; type: ToastType };

let counter = 0;
let items: Item[] = [];
const listeners = new Set<(items: Item[]) => void>();

function emit() {
  const snapshot = [...items];
  listeners.forEach((l) => l(snapshot));
}

function push(message: string, type: ToastType) {
  const id = ++counter;
  items = [...items, { id, message, type }];
  emit();
  setTimeout(() => {
    items = items.filter((i) => i.id !== id);
    emit();
  }, 4000);
}

/**
 * Global toast — call from anywhere, no wiring needed:
 *   toast('Saved');            // info
 *   toast.success('Done');
 *   toast.error('Failed');
 * A single <Toaster /> (mounted once at the app root) renders them.
 */
export const toast = Object.assign(
  (message: string, type: ToastType = 'info') => push(message, type),
  {
    success: (m: string) => push(m, 'success'),
    error: (m: string) => push(m, 'error'),
    info: (m: string) => push(m, 'info'),
  }
);

const ICON = {
  success: <FiCheckCircle className="text-emerald-500 shrink-0" size={18} />,
  error: <FiXCircle className="text-red-500 shrink-0" size={18} />,
  info: <FiInfo className="text-indigo-500 shrink-0" size={18} />,
};

const BORDER = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  info: 'border-l-indigo-500',
};

export const Toaster: React.FC = () => {
  const [list, setList] = useState<Item[]>([]);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  if (!list.length) return null;

  return createPortal(
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
      {list.map((t) => (
        <div
          key={t.id}
          className={`glass px-5 py-4 rounded-2xl flex items-center gap-3 text-sm font-semibold text-slate-800 border-l-4 min-w-[240px] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-200 ${BORDER[t.type]}`}
        >
          {ICON[t.type]}
          <span>{t.message}</span>
        </div>
      ))}
    </div>,
    document.body
  );
};
