import React from 'react';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-fg-muted border-line-strong',
  primary: 'bg-primary-soft text-primary border-primary-border',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  info: 'bg-info-soft text-info border-info/25',
};

interface BadgeProps {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Small status pill. Use `dot` for a leading status indicator. */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', dot = false, className = '', children }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${tones[tone]} ${className}`}
  >
    {dot && <span className="size-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

/** Maps common status strings to a tone so status pills are consistent app-wide. */
export function toneForStatus(status?: string): Tone {
  const s = (status || '').toLowerCase();
  if (/(done|complete|approved|active|paid|success|resolved)/.test(s)) return 'success';
  if (/(progress|review|pending|scheduled|open)/.test(s)) return 'info';
  if (/(hold|warning|overdue|late|at risk|blocked)/.test(s)) return 'warning';
  if (/(fail|reject|closed|cancel|error|overbudget)/.test(s)) return 'danger';
  return 'neutral';
}

export default Badge;
