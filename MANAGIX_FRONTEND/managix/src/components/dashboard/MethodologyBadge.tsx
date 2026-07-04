// PHASE 2: Reusable pill that shows the project's methodology.
// Color follows the MANAGIX accent palette already used in Sidebar.tsx (indigo/emerald/blue/orange).
// Kept pure / stateless — every dashboard view embeds it for consistency.
import React from 'react';
import type { Methodology } from '../../types';

interface Props {
  methodology: Methodology;
  className?: string;
}

const STYLE: Record<string, string> = {
  Scrum:     'bg-primary-soft text-primary border-primary-border',
  Agile:     'bg-success-soft text-success border-success/25',
  Kanban:    'bg-info-soft text-info border-info/25',
  Waterfall: 'bg-warning-soft text-warning border-warning/25',
  Hybrid:    'bg-surface-3 text-fg-muted border-line-strong',
};

const MethodologyBadge: React.FC<Props> = ({ methodology, className }) => {
  const style = STYLE[methodology as string] || STYLE.Hybrid;
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${style} ${className ?? ''}`}
    >
      {methodology}
    </span>
  );
};

export default MethodologyBadge;
