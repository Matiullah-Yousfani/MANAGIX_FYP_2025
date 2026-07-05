import React from 'react';

type Tone =
  | 'gray'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'red'
  | 'blue'
  | 'orange'
  | 'violet';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  /** Small dot before the label. */
  dot?: boolean;
};

const TONES: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
};

const DOT: Record<Tone, string> = {
  gray: 'bg-slate-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  violet: 'bg-violet-500',
};

/** Consistent status pill — use for task/project/QA statuses everywhere. */
const Badge: React.FC<BadgeProps> = ({
  tone = 'gray',
  dot = false,
  className = '',
  children,
  ...rest
}) => (
  <span className={`badge ${TONES[tone]} ${className}`} {...rest}>
    {dot && <span className={`size-1.5 rounded-full ${DOT[tone]}`} />}
    {children}
  </span>
);

export default Badge;
