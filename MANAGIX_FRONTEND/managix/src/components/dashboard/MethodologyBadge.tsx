// PHASE 2: Reusable pill that shows the project's methodology.
// Color follows the MANAGIX accent palette already used in Sidebar.tsx (indigo/emerald/blue/orange).
// Kept pure / stateless — every dashboard view embeds it for consistency.
import React from 'react';
import type { Methodology } from '../../types';
import Badge from '../ui/Badge';

interface Props {
  methodology: Methodology;
  className?: string;
}

const TONE: Record<string, 'indigo' | 'emerald' | 'blue' | 'orange' | 'gray'> = {
  Scrum:     'indigo',
  Agile:     'emerald',
  Kanban:    'blue',
  Waterfall: 'orange',
  Hybrid:    'gray',
};

const MethodologyBadge: React.FC<Props> = ({ methodology, className }) => {
  const tone = TONE[methodology as string] || 'gray';
  return (
    <Badge tone={tone} className={`uppercase ${className ?? ''}`}>
      {methodology}
    </Badge>
  );
};

export default MethodologyBadge;
