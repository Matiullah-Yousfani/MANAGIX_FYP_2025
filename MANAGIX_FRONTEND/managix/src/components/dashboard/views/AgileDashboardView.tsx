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
            className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col"
          >
            <FiZap className="absolute -bottom-4 -right-4 text-gray-50 size-32 group-hover:text-indigo-50 transition-colors pointer-events-none" />
            <div className="relative flex-1">
              <div className="flex justify-between items-start mb-6">
                <MethodologyBadge methodology={p.methodology} />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {p.status || 'Active'}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-3 line-clamp-1">
                {p.title}
              </h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6 line-clamp-2">
                {p.description || 'No description.'}
              </p>

              {/* Sprint snapshot — small KPI strip */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-indigo-50 text-indigo-700 rounded-2xl p-3 text-center">
                  <FiActivity className="mx-auto mb-1" />
                  <div className="text-xs font-black uppercase tracking-widest">Active</div>
                  <div className="text-xl font-black">{p.inProgressTasks}</div>
                </div>
                <div className="bg-emerald-50 text-emerald-700 rounded-2xl p-3 text-center">
                  <FiCheckCircle className="mx-auto mb-1" />
                  <div className="text-xs font-black uppercase tracking-widest">Done</div>
                  <div className="text-xl font-black">{p.completedTasks}</div>
                </div>
                <div className="bg-orange-50 text-orange-700 rounded-2xl p-3 text-center">
                  <FiClock className="mx-auto mb-1" />
                  <div className="text-xs font-black uppercase tracking-widest">Backlog</div>
                  <div className="text-xl font-black">{p.pendingTasks}</div>
                </div>
              </div>

              {/* Burndown sparkline (CSS-only, respects MANAGIX no-extra-deps style) */}
              {p.velocity && p.velocity.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Velocity (last sprints)</div>
                  <div className="flex items-end gap-1 h-12">
                    {p.velocity.map((v, i) => {
                      const max = Math.max(...p.velocity!, 1);
                      const h = Math.max(8, Math.round((v / max) * 48));
                      return (
                        <div
                          key={i}
                          style={{ height: `${h}px` }}
                          className="flex-1 bg-indigo-500/70 rounded-t"
                          title={`Sprint ${i + 1}: ${v} done`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="relative pt-6 border-t border-gray-50 flex items-center justify-between">
              <div className="flex-1 mr-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completion</span>
                  <span className="text-xs font-black text-indigo-600">{completionPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
              <div className="flex items-center text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
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
