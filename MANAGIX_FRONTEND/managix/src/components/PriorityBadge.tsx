import React from 'react';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export function normalizePriority(p?: string | null): TaskPriority {
  const v = (p || 'Medium').trim().toLowerCase();
  if (v === 'high' || v === 'critical') return 'High';
  if (v === 'low') return 'Low';
  return 'Medium';
}

const STYLES: Record<TaskPriority, { dot: string; bg: string; label: string }> = {
  High: { dot: '🟥', bg: 'bg-red-50 text-red-700 border-red-200', label: 'HIGH' },
  Medium: { dot: '🟨', bg: 'bg-amber-50 text-amber-800 border-amber-200', label: 'MEDIUM' },
  Low: { dot: '🟩', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'LOW' },
};

const PriorityBadge: React.FC<{ priority?: string | null; className?: string }> = ({
  priority,
  className = '',
}) => {
  const p = normalizePriority(priority);
  const s = STYLES[p];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${s.bg} ${className}`}
    >
      <span aria-hidden>{s.dot}</span>
      {s.label}
    </span>
  );
};

export default PriorityBadge;
