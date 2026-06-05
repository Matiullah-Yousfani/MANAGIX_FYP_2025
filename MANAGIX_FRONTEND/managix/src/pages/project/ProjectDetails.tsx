import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axiosInstance';
import TaskSection from '../../components/TaskSection';
import MilestoneSection from '../../components/MilestoneSection';
import ProjectGantt from '../../components/ProjectGantt';
import ClosureReportModal from '../../components/ClosureReportModal';
import { normalizeProject } from '../../api/normalize';
import { projectService } from '../../api/projectService';
import { teamService } from '../../api/teamService';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [timelineKey, setTimelineKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamDetail, setTeamDetail] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigneeNames, setAssigneeNames] = useState<Record<string, string>>({});
  const role = localStorage.getItem('userRole');

  const normStatus = (s: string) => String(s ?? '').toLowerCase();
  const activeTasks = tasks.filter((t) => ['todo', 'inprogress', 'pending'].includes(normStatus(t.status)));
  const qaReviewTasks = tasks.filter((t) => ['done', 'submitted'].includes(normStatus(t.status)));
  const doneTasks = tasks.filter((t) => normStatus(t.status) === 'approved');
  const nameFor = (id?: string) => (id ? assigneeNames[id] ?? 'Unassigned' : 'Unassigned');

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

const fetchProjectData = async () => {
  try {
    const [projRes, mileRes, taskRes] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/milestones/project/${projectId}`),
      api.get(`/tasks/project/${projectId}`)
    ]);

    setProject(normalizeProject(projRes.data));
    
    // Normalize Milestones for MilestoneSection.tsx
    // Component uses: milestoneId, title, status
    const normalizedMilestones = (mileRes.data || []).map((m: any) => ({
      ...m,
      milestoneId: m.milestoneId || m.MilestoneId,
      title: m.title || m.Title,
      status: m.status || m.Status
    }));
    setMilestones(normalizedMilestones);

    // Normalize Tasks for TaskSection.tsx
    // Component uses: taskId, title, description, status, assignedEmployeeId
    const normalizedTasks = (taskRes.data || []).map((t: any) => ({
      ...t,
      taskId: t.taskId || t.TaskId,
      projectId: t.projectId || t.ProjectId,
      milestoneId: t.milestoneId || t.MilestoneId,
      title: t.title || t.Title,
      description: t.description || t.Description,
      status: t.status || t.Status,
      assignedEmployeeId: t.assignedEmployeeId || t.AssignedEmployeeId
    }));
    setTasks(normalizedTasks);
    setTimelineKey((k) => k + 1);

    try {
      const adminDetail = await projectService.getAdminDetail(projectId!);
      const members = adminDetail?.members ?? adminDetail?.Members ?? [];
      const teams = adminDetail?.teams ?? adminDetail?.Teams ?? [];
      setTeamDetail(teams[0] ?? null);
      const names: Record<string, string> = {};
      members.forEach((m: any) => {
        const id = String(m.userId ?? m.UserId ?? '');
        if (id) names[id] = m.fullName ?? m.FullName ?? 'Member';
      });
      (adminDetail?.tasks ?? adminDetail?.Tasks ?? []).forEach((t: any) => {
        const aid = String(t.assignedEmployeeId ?? t.AssignedEmployeeId ?? '');
        const an = t.assignedEmployeeName ?? t.AssignedEmployeeName;
        if (aid && an) names[aid] = an;
      });
      setAssigneeNames(names);
      if (teams[0]?.teamId ?? teams[0]?.TeamId) {
        const tm = await teamService.getTeamMembers(String(teams[0].teamId ?? teams[0].TeamId));
        setTeamMembers(tm || []);
      } else {
        setTeamMembers(members);
      }
    } catch {
      setTeamDetail(null);
      setTeamMembers([]);
    }

  } catch (err) {
    console.error("Error loading project details", err);
    // Safety fallback to prevent UI from breaking
    setMilestones([]);
    setTasks([]);
  }
};
  if (!project) return <div className="p-10">Loading Project...</div>;

  const isClosed =
    project.status === 'Completed' ||
    project.Status === 'Completed' ||
    project.isClosed;

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-4">{project.title}</h1>
            <p className="text-gray-600 leading-relaxed">{project.description}</p>
          </div>
          {isClosed && projectId && (
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"
            >
              Closure report
            </button>
          )}
        </div>
        <div className="mt-6 flex gap-4">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
            Status: {project.status || project.Status || 'Active'}
          </span>
        </div>
      </div>

      {projectId && (
        <ProjectGantt
          projectId={projectId}
          projectTitle={project.title}
          refreshKey={timelineKey}
          milestones={milestones}
          tasks={tasks}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <h2 className="text-xl font-black text-gray-900">Team & task overview</h2>
        {!teamDetail && teamMembers.length === 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-4">
            No team assigned to this project yet. Use <strong>Team Hub</strong> to assign a team, or data is not available.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-indigo-50/50 rounded-xl p-4">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">Manager</p>
                <p className="font-bold text-indigo-900">
                  {teamDetail?.createdByName ?? teamDetail?.CreatedByName ?? '—'}
                </p>
                {teamDetail?.name ?? teamDetail?.Name ? (
                  <p className="text-xs text-gray-500 mt-1">Team: {teamDetail.name ?? teamDetail.Name}</p>
                ) : null}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Team members</p>
                <ul className="text-sm space-y-1">
                  {teamMembers.map((m: any) => (
                    <li key={m.userId ?? m.UserId} className="flex justify-between">
                      <span className="font-bold">{m.fullName ?? m.FullName}</span>
                      <span className="text-xs text-gray-500">{m.roleName ?? m.RoleName ?? 'Employee'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <TaskBucket title="Active tasks (Todo / In progress)" tasks={activeTasks} nameFor={nameFor} empty="No active tasks." />
            <TaskBucket title="QA review queue" tasks={qaReviewTasks} nameFor={nameFor} empty="No tasks awaiting QA review." tone="amber" />
            <TaskBucket title="Completed (Approved)" tasks={doneTasks} nameFor={nameFor} empty="No approved tasks yet." tone="emerald" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Tasks (Takes more space) */}
        <div className="lg:col-span-2">
          <TaskSection 
            tasks={tasks} 
            projectId={projectId!} 
            milestones={milestones}
            refresh={fetchProjectData} 
          />
        </div>

        {/* Right Side: Milestones/Progress */}
        <div className="lg:col-span-1">
          <MilestoneSection 
            milestones={milestones} 
            projectId={projectId!}
            refresh={fetchProjectData}
          />
        </div>
      </div>

      {projectId && (
        <ClosureReportModal
          projectId={projectId}
          open={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
};

const TaskBucket: React.FC<{
  title: string;
  tasks: any[];
  nameFor: (id?: string) => string;
  empty: string;
  tone?: 'amber' | 'emerald';
}> = ({ title, tasks, nameFor, empty, tone }) => (
  <div>
    <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-2">{title}</h3>
    {tasks.length === 0 ? (
      <p className="text-sm text-gray-400 italic">{empty}</p>
    ) : (
      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {tasks.map((t) => (
          <li
            key={t.taskId}
            className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-2"
          >
            <div>
              <p className="font-bold">{t.title}</p>
              <p className="text-xs text-gray-500">Assigned: {nameFor(String(t.assignedEmployeeId ?? ''))}</p>
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                tone === 'amber'
                  ? 'bg-amber-100 text-amber-700'
                  : tone === 'emerald'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {t.status}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default ProjectDetails;