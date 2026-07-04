// PHASE 2: Waterfall dashboard — phase-oriented. Visual story = a milestone strip with deadlines.
// Receives milestone data per project; falls back to a simple % bar if milestones aren't loaded yet.
import React from 'react';
import { motion } from 'framer-motion';
import { FiLayers, FiCalendar, FiChevronRight, FiCheckCircle } from 'react-icons/fi';
import MethodologyBadge from '../MethodologyBadge';
import ProjectGantt from '../../ProjectGantt';
import type { Methodology } from '../../../types';

export interface WaterfallMilestone {
  milestoneId: string;
  title: string;
  status: string;
  deadline: string;
}

export interface WaterfallDashboardProject {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  deadline?: string;
  methodology: Methodology;
  totalTasks: number;
  completedTasks: number;
  milestones: WaterfallMilestone[];
}

interface Props {
  projects: WaterfallDashboardProject[];
  onOpen: (projectId: string) => void;
}

const WaterfallDashboardView: React.FC<Props> = ({ projects, onOpen }) => {
  return (
    <div className="space-y-8">
      {projects.map((p) => {
        const completionPct = p.totalTasks ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
        return (
          <motion.div
            key={p.projectId}
            layout
            onClick={() => onOpen(p.projectId)}
            className="group bg-surface rounded-xl p-5 border border-line hover:border-line-strong hover:bg-surface-2 hover:shadow-e2 transition-all duration-200 cursor-pointer relative overflow-hidden"
          >
            <FiLayers className="absolute -bottom-4 -right-4 text-white/3 size-32 group-hover:text-warning/10 transition-colors pointer-events-none" />

            <div className="flex justify-between items-start mb-5 relative">
              <div>
                <h3 className="text-lg font-bold text-fg group-hover:text-warning transition-colors mb-1">
                  {p.title}
                </h3>
                <p className="text-fg-muted text-sm leading-relaxed line-clamp-2">
                  {p.description || 'No description.'}
                </p>
                {p.deadline && (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-fg-subtle">
                    <FiCalendar /> Final: {new Date(p.deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
              <MethodologyBadge methodology={p.methodology} />
            </div>

            {/* Phase strip — sequential milestones rendered as a horizontal track */}
            <div className="relative mb-5">
              <div className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide mb-3">Phases</div>
              {p.milestones.length === 0 ? (
                <div className="text-sm text-fg-subtle">No milestones defined yet.</div>
              ) : (
                <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                  {p.milestones.map((m, idx) => {
                    const done = m.status?.toLowerCase().includes('complete');
                    return (
                      <div key={m.milestoneId} className="min-w-[180px] flex-1">
                        <div className="flex items-center mb-1">
                          <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                            done ? 'bg-success border-success text-primary-fg' : 'bg-surface-2 border-line-strong text-fg-subtle'
                          }`}>
                            {done ? <FiCheckCircle className="size-3" /> : idx + 1}
                          </div>
                          {idx < p.milestones.length - 1 && (
                            <div className={`flex-1 h-0.5 ${done ? 'bg-success/50' : 'bg-line-strong'}`} />
                          )}
                        </div>
                        <div className={`rounded-lg p-3 border ${
                          done ? 'bg-success-soft border-success/25' : 'bg-surface-2 border-line'
                        }`}>
                          <div className="text-xs font-semibold text-fg line-clamp-1">{m.title}</div>
                          <div className="text-[10px] font-medium text-fg-subtle mt-1">
                            {new Date(m.deadline).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] font-semibold uppercase tracking-wide mt-1 text-fg-muted">
                            {m.status}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5" onClick={(e) => e.stopPropagation()}>
              <ProjectGantt projectId={p.projectId} />
            </div>

            <div className="relative pt-4 border-t border-line flex items-center justify-between mt-4">
              <div className="flex-1 mr-6">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide">Overall progress</span>
                  <span className="text-xs font-bold text-warning">{completionPct}%</span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-warning" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpen(p.projectId); }}
                className="flex items-center gap-1 text-warning font-semibold text-sm hover:translate-x-1 transition-transform"
              >
                Open Plan <FiChevronRight />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default WaterfallDashboardView;
