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
            className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
            <FiTrello className="absolute -bottom-4 -right-4 text-gray-50 size-32 group-hover:text-blue-50 transition-colors pointer-events-none" />

            <div className="flex justify-between items-start mb-6 relative">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-1">
                  {p.title}
                </h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed line-clamp-1">
                  {p.description || 'No description.'}
                </p>
              </div>
              <MethodologyBadge methodology={p.methodology} />
            </div>

            {/* The three Kanban columns rendered as mini-stacks */}
            <div className="grid grid-cols-3 gap-3 mb-6 relative">
              <KanbanColumn label="Backlog" count={p.pendingTasks} colorClass="bg-orange-50 text-orange-700 border-orange-100" />
              <KanbanColumn
                label="In Progress"
                count={p.inProgressTasks}
                colorClass={`${overWip ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}
                hint={`WIP ${p.inProgressTasks}/${wip}`}
                warning={overWip}
              />
              <KanbanColumn label="Done" count={p.completedTasks} colorClass="bg-emerald-50 text-emerald-700 border-emerald-100" />
            </div>

            <div className="flex items-center justify-between relative pt-4 border-t border-gray-50">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.status || 'Active'}</span>
              <div className="flex items-center text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
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
  <div className={`rounded-2xl border p-3 text-center ${colorClass}`}>
    <div className="text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
      {warning && <FiAlertTriangle className="size-3" />}
      {label}
    </div>
    <div className="text-2xl font-black my-1">{count}</div>
    {hint && <div className="text-[10px] font-bold opacity-80">{hint}</div>}
  </div>
);

export default KanbanDashboardView;
