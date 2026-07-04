// PHASE 2: Agile / Scrum dashboard view.
// Visual story: emphasise sprints (2-week buckets) and a velocity / burndown summary.
// Pure presentation — receives projects + per-project task arrays as props.
// Branding follows the existing MANAGIX palette (indigo accent, gray-50 surfaces, big rounded cards).
import React from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiCheckCircle, FiClock, FiActivity, FiChevronRight } from 'react-icons/fi';
import MethodologyBadge from '../MethodologyBadge';
import type { Methodology } from '../../../types';

export interface AgileDashboardProject {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  methodology: Methodology;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  // Optional series — last 7 sprints' completed counts. Populated by parent if available.
  velocity?: number[];
}

interface Props {
  projects: AgileDashboardProject[];
  onOpen: (projectId: string) => void;
}

const AgileDashboardView: React.FC<Props> = ({ projects, onOpen }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {projects.map((p) => {
        const completionPct = p.totalTasks ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
        return (
          <motion.div
            key={p.projectId}
            layout
            onClick={() => onOpen(p.projectId)}
            className="group bg-surface rounded-xl p-5 border border-line hover:border-line-strong hover:bg-surface-2 hover:shadow-e2 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col"
          >
            <FiZap className="absolute -bottom-4 -right-4 text-white/3 size-32 group-hover:text-primary/10 transition-colors pointer-events-none" />
            <div className="relative flex-1">
              <div className="flex justify-between items-start mb-4">
                <MethodologyBadge methodology={p.methodology} />
                <span className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide">
                  {p.status || 'Active'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-fg group-hover:text-primary transition-colors mb-2 line-clamp-1">
                {p.title}
              </h3>
              <p className="text-fg-muted text-sm leading-relaxed mb-5 line-clamp-2">
                {p.description || 'No description.'}
              </p>

              {/* Sprint snapshot — small KPI strip */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-primary-soft text-primary rounded-lg p-3 text-center border border-primary-border">
                  <FiActivity className="mx-auto mb-1" />
                  <div className="text-[10px] font-semibold uppercase tracking-wide">Active</div>
                  <div className="text-xl font-bold">{p.inProgressTasks}</div>
                </div>
                <div className="bg-success-soft text-success rounded-lg p-3 text-center border border-success/25">
                  <FiCheckCircle className="mx-auto mb-1" />
                  <div className="text-[10px] font-semibold uppercase tracking-wide">Done</div>
                  <div className="text-xl font-bold">{p.completedTasks}</div>
                </div>
                <div className="bg-warning-soft text-warning rounded-lg p-3 text-center border border-warning/25">
                  <FiClock className="mx-auto mb-1" />
                  <div className="text-[10px] font-semibold uppercase tracking-wide">Backlog</div>
                  <div className="text-xl font-bold">{p.pendingTasks}</div>
                </div>
              </div>

              {/* Burndown sparkline (CSS-only, respects MANAGIX no-extra-deps style) */}
              {p.velocity && p.velocity.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide mb-2">Velocity (last sprints)</div>
                  <div className="flex items-end gap-1 h-12">
                    {p.velocity.map((v, i) => {
                      const max = Math.max(...p.velocity!, 1);
                      const h = Math.max(8, Math.round((v / max) * 48));
                      return (
                        <div
                          key={i}
                          style={{ height: `${h}px` }}
                          className="flex-1 bg-primary/70 rounded-t"
                          title={`Sprint ${i + 1}: ${v} done`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="relative pt-4 border-t border-line flex items-center justify-between">
              <div className="flex-1 mr-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide">Completion</span>
                  <span className="text-xs font-bold text-primary">{completionPct}%</span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1 text-primary font-semibold text-sm group-hover:translate-x-1 transition-transform">
                Sprint <FiChevronRight />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AgileDashboardView;
