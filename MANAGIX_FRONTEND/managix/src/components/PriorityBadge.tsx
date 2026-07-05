import React from 'react';
import Badge from './ui/Badge';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export function normalizePriority(p?: string | null): TaskPriority {
  const v = (p || 'Medium').trim().toLowerCase();
  if (v === 'high' || v === 'critical') return 'High';
  if (v === 'low') return 'Low';
  return 'Medium';
}

const TONE = { High: 'red', Medium: 'amber', Low: 'emerald' } as const;

const PriorityBadge: React.FC<{ priority?: string | null; className?: string }> = ({
  priority,
  className = '',
}) => {
  const p = normalizePriority(priority);
  return (
    <Badge tone={TONE[p]} dot className={`uppercase tracking-widest ${className}`}>
      {p}
    </Badge>
  );
};

export default PriorityBadge;
