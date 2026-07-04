import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { projectService } from '../../api/projectService';
import { adminService } from '../../api/adminService';
import ClosureReportModal from '../ClosureReportModal';
import ProjectGantt from '../ProjectGantt';
import { pick } from '../../api/normalize';

const AdminProjectsTab: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectMeta, setProjectMeta] = useState<Record<string, { memberNames: string[]; teamName?: string }>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [ganttKey, setGanttKey] = useState(0);

  useEffect(() => {
    api.get('/projects').then(async (r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setProjects(list);
      const meta: Record<string, { memberNames: string[]; teamName?: string }> = {};
      await Promise.all(
        list.map(async (p: any) => {
          const id = String(pick(p, 'projectId', 'ProjectId') ?? '');
          if (!id) return;
          try {
            const d = await adminService.getAdminProjectDetailPage(id);
            const members = (d?.members ?? d?.Members ?? []).map(
              (m: any) => m.fullName ?? m.FullName ?? ''
            ).filter(Boolean);
            const team = (d?.teams ?? d?.Teams ?? [])[0];
            meta[id] = {
              memberNames: members,
              teamName: team?.name ?? team?.Name,
            };
          } catch {
            meta[id] = { memberNames: [] };
          }
        })
      );
      setProjectMeta(meta);
    }).catch(() => setProjects([]));
  }, []);

  const openProject = async (id: string) => {
    setSelectedId(id);
    setGanttKey((k) => k + 1);
    const d = await adminService.getAdminProjectDetailPage(id).catch(() => projectService.getAdminDetail(id));
    setDetail(d);
  };

  const tasks = detail?.tasks ?? detail?.Tasks ?? [];
  const milestones = detail?.milestones ?? detail?.Milestones ?? [];
  const teams = detail?.teams ?? detail?.Teams ?? [];
  const members = detail?.members ?? detail?.Members ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
        {projects.map((p) => {
          const id = String(pick(p, 'projectId', 'ProjectId') ?? '');
          const title = pick(p, 'title', 'Title') ?? 'Untitled';
          const status = pick(p, 'status', 'Status');
          const closed = Boolean(pick(p, 'isClosed', 'IsClosed'));
          return (
            <button
              key={id}
              type="button"
              onClick={() => openProject(id)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${selectedId === id ? 'border-primary bg-primary-soft shadow-e1' : 'border-line bg-surface hover:border-line-strong'}`}
            >
              <p className="font-bold text-fg">{title}</p>
              <p className="text-xs text-fg-muted mt-0.5">{status} · {closed ? 'Closed' : 'Active'}</p>
              {projectMeta[id]?.teamName && (
                <p className="text-[10px] font-bold text-primary mt-2 uppercase tracking-wide">{projectMeta[id].teamName}</p>
              )}
              {projectMeta[id]?.memberNames?.length > 0 && (
                <p className="text-[11px] text-fg-muted mt-1 leading-snug">
                  {projectMeta[id].memberNames.slice(0, 4).join(' · ')}
                  {projectMeta[id].memberNames.length > 4 ? ` +${projectMeta[id].memberNames.length - 4}` : ''}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="lg:col-span-2 space-y-6">
        {!detail ? (
          <p className="text-fg-subtle">Select a project to view full details.</p>
        ) : (
          <>
            <div className="bg-surface rounded-xl border border-line p-6 space-y-3">
              <h2 className="text-2xl font-bold text-fg">{detail.title ?? detail.Title}</h2>
              <p className="text-fg-muted text-sm">{detail.description ?? detail.Description}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-fg">
                <div><span className="text-fg-subtle block">Created by</span><strong>{detail.createdByName ?? detail.CreatedByName ?? '—'}</strong></div>
                <div><span className="text-fg-subtle block">Manager</span><strong>{detail.managerName ?? detail.ManagerName ?? '—'}</strong></div>
                <div><span className="text-fg-subtle block">Deadline</span><strong>{String(detail.deadline ?? detail.Deadline ?? '').slice(0, 10)}</strong></div>
                <div><span className="text-fg-subtle block">Budget</span><strong>${detail.budget ?? detail.Budget ?? 0}</strong></div>
              </div>
              <p className="text-sm text-fg-muted">
                {milestones.length} milestones · {tasks.length} tasks · {members.length} members · {teams.length} team(s)
              </p>
              {(detail.status === 'Completed' || detail.isClosed || detail.IsClosed) && (
                <button type="button" onClick={() => setReportOpen(true)} className="px-4 py-2 bg-primary text-primary-fg rounded-lg text-xs font-bold">
                  Closure report
                </button>
              )}
            </div>

            {selectedId && <ProjectGantt projectId={selectedId} refreshKey={ganttKey} />}

            {teams.length > 0 && (
              <div className="bg-surface rounded-xl border border-line p-6">
                <h3 className="font-bold text-sm uppercase tracking-widest text-fg-subtle mb-3">Teams</h3>
                {teams.map((t: any) => (
                  <div key={t.teamId ?? t.TeamId} className="border-b border-line py-2 text-sm text-fg">
                    <strong>{t.name ?? t.Name}</strong>
                    <span className="text-fg-muted ml-2">
                      · Created by {t.createdByName ?? t.CreatedByName ?? '—'} · {t.memberCount ?? t.MemberCount ?? 0} members
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-surface rounded-xl border border-line p-6 max-h-72 overflow-y-auto">
              <h3 className="font-bold text-sm uppercase tracking-widest text-fg-subtle mb-3">Milestones & timeline</h3>
              {milestones.length === 0 ? (
                <p className="text-fg-subtle text-sm">No milestones.</p>
              ) : (
                milestones.map((m: any) => (
                  <div key={m.milestoneId ?? m.MilestoneId} className="mb-4 pb-3 border-b border-line">
                    <div className="flex justify-between">
                      <strong className="text-sm text-fg">{m.title ?? m.Title}</strong>
                      <span className="text-xs text-primary">{m.status ?? m.Status}</span>
                    </div>
                    <p className="text-xs text-fg-muted mt-1">
                      Deadline: {String(m.deadline ?? m.Deadline ?? '').slice(0, 10)} · Budget: {m.budgetAllocated ?? m.BudgetAllocated ?? 0}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {tasks
                        .filter((t: any) => String(t.milestoneId ?? t.MilestoneId) === String(m.milestoneId ?? m.MilestoneId))
                        .map((t: any) => (
                          <li key={t.taskId ?? t.TaskId} className="text-xs flex justify-between bg-surface-2 rounded-lg px-3 py-2 text-fg">
                            <span>{t.title ?? t.Title}</span>
                            <span className="text-fg-muted">
                              {t.assignedEmployeeName ?? t.AssignedEmployeeName ?? 'Unassigned'} · {t.status ?? t.Status}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))
              )}
            </div>

            <div className="bg-surface rounded-xl border border-line p-6 max-h-64 overflow-y-auto">
              <h3 className="font-bold text-sm uppercase tracking-widest text-fg-subtle mb-3">All tasks</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-fg-subtle">
                    <th className="pb-2">Task</th>
                    <th className="pb-2">Assigned to</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t: any) => (
                    <tr key={t.taskId ?? t.TaskId} className="border-t border-line text-fg">
                      <td className="py-2 pr-2">{t.title ?? t.Title}</td>
                      <td className="py-2 text-fg-muted">{t.assignedEmployeeName ?? t.AssignedEmployeeName ?? '—'}</td>
                      <td className="py-2">{t.status ?? t.Status}</td>
                      <td className="py-2">{t.priority ?? t.Priority ?? 'Medium'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selectedId && <ClosureReportModal projectId={selectedId} open={reportOpen} onClose={() => setReportOpen(false)} />}
    </div>
  );
};

export default AdminProjectsTab;
