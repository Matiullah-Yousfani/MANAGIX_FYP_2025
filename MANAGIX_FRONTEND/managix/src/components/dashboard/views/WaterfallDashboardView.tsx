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
            className="group card card-hover p-8 cursor-pointer relative overflow-hidden"
          >
            <FiLayers className="absolute -bottom-4 -right-4 text-gray-50 size-32 group-hover:text-orange-50 transition-colors pointer-events-none" />

            <div className="flex justify-between items-start mb-6 relative">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-2">
                  {p.title}
                </h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed line-clamp-2">
                  {p.description || 'No description.'}
                </p>
                {p.deadline && (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-gray-500">
                    <FiCalendar /> Final: {new Date(p.deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
              <MethodologyBadge methodology={p.methodology} />
            </div>

            {/* Phase strip — sequential milestones rendered as a horizontal track */}
            <div className="relative mb-6">
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">Phases</div>
              {p.milestones.length === 0 ? (
                <div className="text-sm text-gray-400 italic">No milestones defined yet.</div>
              ) : (
                <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                  {p.milestones.map((m, idx) => {
                    const done = m.status?.toLowerCase().includes('complete');
                    return (
                      <div key={m.milestoneId} className="min-w-[180px] flex-1">
                        <div className="flex items-center mb-1">
                          <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 ${
                            done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-500'
                          }`}>
                            {done ? <FiCheckCircle className="size-3" /> : idx + 1}
                          </div>
                          {idx < p.milestones.length - 1 && (
                            <div className={`flex-1 h-0.5 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                          )}
                        </div>
                        <div className={`rounded-2xl p-3 border ${
                          done ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-200/70'
                        }`}>
                          <div className="text-xs font-bold text-gray-800 line-clamp-1">{m.title}</div>
                          <div className="text-[10px] font-bold text-gray-500 mt-1">
                            {new Date(m.deadline).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] font-extrabold uppercase tracking-widest mt-1">
                            {m.status}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6" onClick={(e) => e.stopPropagation()}>
              <ProjectGantt projectId={p.projectId} />
            </div>

            <div className="relative pt-4 border-t border-gray-50 flex items-center justify-between mt-4">
              <div className="flex-1 mr-6">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Overall progress</span>
                  <span className="text-xs font-extrabold text-orange-600">{completionPct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpen(p.projectId); }}
                className="flex items-center text-orange-600 font-bold text-sm hover:translate-x-1 transition-transform"
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
