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
  Scrum:     'bg-indigo-100 text-indigo-700',
  Agile:     'bg-emerald-100 text-emerald-700',
  Kanban:    'bg-blue-100 text-blue-700',
  Waterfall: 'bg-orange-100 text-orange-700',
  Hybrid:    'bg-gray-100 text-gray-700',
};

const MethodologyBadge: React.FC<Props> = ({ methodology, className }) => {
  const style = STYLE[methodology as string] || STYLE.Hybrid;
  return (
    <span
      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${style} ${className ?? ''}`}
    >
      {methodology}
    </span>
  );
};

export default MethodologyBadge;
