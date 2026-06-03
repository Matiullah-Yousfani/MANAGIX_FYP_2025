import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axiosInstance';
import TaskSection from '../../components/TaskSection';
import MilestoneSection from '../../components/MilestoneSection';
import ProjectGantt from '../../components/ProjectGantt';
import ClosureReportModal from '../../components/ClosureReportModal';
import { normalizeProject } from '../../api/normalize';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [timelineKey, setTimelineKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const role = localStorage.getItem('userRole');

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

export default ProjectDetails;