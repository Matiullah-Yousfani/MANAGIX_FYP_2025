// PHASE 2: Single entry point that decides which methodology-specific view to render.
//
// Why a dispatcher (not a forked Dashboard.tsx)?
//   - Keeps data-fetching, search, and modals in the existing Dashboard page.
//   - Each view is a pure presentation component, easy to evolve in isolation.
//   - Adding a new methodology later means one new file + one switch case.
//
// Inputs:
//   - The same project list the dashboard already has, augmented with task aggregates
//     and (for waterfall) milestones. The dispatcher groups projects by methodology
//     so each view receives only the projects it should render — preserves heterogenous
//     dashboards (a manager with both Scrum and Waterfall projects sees BOTH layouts stacked).
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiTrello, FiLayers, FiBriefcase } from 'react-icons/fi';
import AgileDashboardView, { type AgileDashboardProject } from './views/AgileDashboardView';
import KanbanDashboardView, { type KanbanDashboardProject } from './views/KanbanDashboardView';
import WaterfallDashboardView, { type WaterfallDashboardProject, type WaterfallMilestone } from './views/WaterfallDashboardView';
import { getMethodology, type Methodology } from '../../types';

export interface DashboardProjectInput {
  projectId?: string;
  ProjectId?: string;
  title?: string;
  Title?: string;
  description?: string;
  Description?: string;
  status?: string;
  Status?: string;
  deadline?: string;
  Deadline?: string;
  modelId?: string;
  ModelId?: string;
  projectModel?: { methodology?: string | null } | null;
  ProjectModel?: { methodology?: string | null } | null;
}

export interface ProjectAggregates {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  velocity?: number[];
  milestones?: WaterfallMilestone[];
}

interface Props {
  projects: DashboardProjectInput[];
  // Map of projectId → aggregates. Caller fetches once and passes in. Keys can be either casing of the id.
  aggregatesById?: Record<string, ProjectAggregates>;
  onOpen: (projectId: string) => void;
}

const SECTION_META: Record<string, { label: string; icon: React.ReactNode; accent: string }> = {
  Scrum:     { label: 'Scrum / Agile sprints',  icon: <FiZap />,    accent: 'text-indigo-600' },
  Agile:     { label: 'Agile sprints',          icon: <FiZap />,    accent: 'text-indigo-600' },
  Kanban:    { label: 'Kanban flow',            icon: <FiTrello />, accent: 'text-blue-600' },
  Waterfall: { label: 'Waterfall phases',       icon: <FiLayers />, accent: 'text-orange-600' },
  Hybrid:    { label: 'Mixed / unspecified',    icon: <FiBriefcase />, accent: 'text-gray-600' },
};

const MethodologyDashboard: React.FC<Props> = ({ projects, aggregatesById, onOpen }) => {
  // Group projects by their resolved methodology.
  const groups: Record<Methodology, DashboardProjectInput[]> = {
    Scrum: [], Agile: [], Kanban: [], Waterfall: [], Hybrid: [],
  };
  for (const p of projects) {
    const m = getMethodology(p);
    (groups[m] ?? groups.Hybrid).push(p);
  }

  const order: Methodology[] = ['Scrum', 'Agile', 'Kanban', 'Waterfall', 'Hybrid'];

  return (
    <div className="space-y-12">
      <AnimatePresence>
        {order.map((m) => {
          const projectsInGroup = groups[m];
          if (!projectsInGroup || projectsInGroup.length === 0) return null;
          const meta = SECTION_META[m] || SECTION_META.Hybrid;

          return (
            <motion.section
              key={m}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className={`text-2xl font-black flex items-center gap-3 ${meta.accent}`}>
                  {meta.icon}
                  {meta.label}
                </h2>
                <span className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                  {projectsInGroup.length} {projectsInGroup.length === 1 ? 'project' : 'projects'}
                </span>
              </div>

              {renderViewFor(m, projectsInGroup, aggregatesById, onOpen)}
            </motion.section>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// PHASE 2: shape the raw input + aggregates into the strict view-specific props.
function renderViewFor(
  m: Methodology,
  projects: DashboardProjectInput[],
  aggregatesById: Record<string, ProjectAggregates> | undefined,
  onOpen: (projectId: string) => void,
) {
  const lookupAgg = (id: string): ProjectAggregates => {
    const fromMap = aggregatesById?.[id] ?? aggregatesById?.[id.toLowerCase()];
    return fromMap ?? { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, pendingTasks: 0 };
  };

  if (m === 'Scrum' || m === 'Agile') {
    const data: AgileDashboardProject[] = projects.map((p) => {
      const id = (p.projectId || p.ProjectId)!;
      const agg = lookupAgg(id);
      return {
        projectId: id,
        title: (p.title || p.Title) ?? 'Untitled',
        description: p.description || p.Description,
        status: p.status || p.Status,
        methodology: m,
        ...agg,
      };
    });
    return <AgileDashboardView projects={data} onOpen={onOpen} />;
  }

  if (m === 'Kanban') {
    const data: KanbanDashboardProject[] = projects.map((p) => {
      const id = (p.projectId || p.ProjectId)!;
      const agg = lookupAgg(id);
      return {
        projectId: id,
        title: (p.title || p.Title) ?? 'Untitled',
        description: p.description || p.Description,
        status: p.status || p.Status,
        methodology: m,
        ...agg,
      };
    });
    return <KanbanDashboardView projects={data} onOpen={onOpen} />;
  }

  if (m === 'Waterfall') {
    const data: WaterfallDashboardProject[] = projects.map((p) => {
      const id = (p.projectId || p.ProjectId)!;
      const agg = lookupAgg(id);
      return {
        projectId: id,
        title: (p.title || p.Title) ?? 'Untitled',
        description: p.description || p.Description,
        status: p.status || p.Status,
        deadline: p.deadline || p.Deadline,
        methodology: m,
        totalTasks: agg.totalTasks,
        completedTasks: agg.completedTasks,
        milestones: agg.milestones ?? [],
      };
    });
    return <WaterfallDashboardView projects={data} onOpen={onOpen} />;
  }

  // Hybrid / unknown — fall back to the Agile layout (informationally richest).
  const data: AgileDashboardProject[] = projects.map((p) => {
    const id = (p.projectId || p.ProjectId)!;
    const agg = lookupAgg(id);
    return {
      projectId: id,
      title: (p.title || p.Title) ?? 'Untitled',
      description: p.description || p.Description,
      status: p.status || p.Status,
      methodology: 'Hybrid',
      ...agg,
    };
  });
  return <AgileDashboardView projects={data} onOpen={onOpen} />;
}

export default MethodologyDashboard;
