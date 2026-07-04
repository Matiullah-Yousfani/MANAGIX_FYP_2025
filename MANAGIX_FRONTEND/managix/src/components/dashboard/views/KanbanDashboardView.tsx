// PHASE 2: Kanban dashboard — flow-oriented. Visual story = three columns + WIP indicators.
// Same project array shape as the Agile view; columns are derived from totals.
import React from 'react';
import { motion } from 'framer-motion';
import { FiTrello, FiAlertTriangle, FiChevronRight } from 'react-icons/fi';
import MethodologyBadge from '../MethodologyBadge';
import type { Methodology } from '../../../types';

export interface KanbanDashboardProject {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  methodology: Methodology;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  wipLimit?: number; // soft visual cue — defaults to 5 if not provided
}

interface Props {
  projects: KanbanDashboardProject[];
  onOpen: (projectId: string) => void;
}

const KanbanDashboardView: React.FC<Props> = ({ projects, onOpen }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {projects.map((p) => {
        const wip = p.wipLimit ?? 5;
        const overWip = p.inProgressTasks > wip;
        return (
          <motion.div
            key={p.projectId}
            layout
            onClick={() => onOpen(p.projectId)}
            className="group bg-surface rounded-xl p-5 border border-line hover:border-line-strong hover:bg-surface-2 hover:shadow-e2 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden"
          >
            <FiTrello className="absolute -bottom-4 -right-4 text-white/3 size-32 group-hover:text-info/10 transition-colors pointer-events-none" />

            <div className="flex justify-between items-start mb-5 relative">
              <div>
                <h3 className="text-lg font-bold text-fg group-hover:text-info transition-colors mb-1 line-clamp-1">
                  {p.title}
                </h3>
                <p className="text-fg-muted text-sm leading-relaxed line-clamp-1">
                  {p.description || 'No description.'}
                </p>
              </div>
              <MethodologyBadge methodology={p.methodology} />
            </div>

            {/* The three Kanban columns rendered as mini-stacks */}
            <div className="grid grid-cols-3 gap-3 mb-5 relative">
              <KanbanColumn label="Backlog" count={p.pendingTasks} colorClass="bg-warning-soft text-warning border-warning/25" />
              <KanbanColumn
                label="In Progress"
                count={p.inProgressTasks}
                colorClass={`${overWip ? 'bg-danger-soft text-danger border-danger/25' : 'bg-info-soft text-info border-info/25'}`}
                hint={`WIP ${p.inProgressTasks}/${wip}`}
                warning={overWip}
              />
              <KanbanColumn label="Done" count={p.completedTasks} colorClass="bg-success-soft text-success border-success/25" />
            </div>

            <div className="flex items-center justify-between relative pt-4 border-t border-line">
              <span className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide">{p.status || 'Active'}</span>
              <div className="flex items-center gap-1 text-info font-semibold text-sm group-hover:translate-x-1 transition-transform">
                Open Board <FiChevronRight />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// PHASE 2: small column tile with a "stack" visual.
const KanbanColumn: React.FC<{ label: string; count: number; colorClass: string; hint?: string; warning?: boolean }> = ({
  label, count, colorClass, hint, warning
}) => (
  <div className={`rounded-lg border p-3 text-center ${colorClass}`}>
    <div className="text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1">
      {warning && <FiAlertTriangle className="size-3" />}
      {label}
    </div>
    <div className="text-2xl font-bold my-1">{count}</div>
    {hint && <div className="text-[10px] font-medium opacity-80">{hint}</div>}
  </div>
);

export default KanbanDashboardView;
