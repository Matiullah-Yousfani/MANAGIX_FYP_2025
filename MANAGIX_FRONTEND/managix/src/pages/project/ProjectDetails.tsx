import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axiosInstance';
import TaskSection from '../../components/TaskSection';
import MilestoneSection from '../../components/MilestoneSection';

const ProjectDetails = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<any>(null);
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

    // Set the project details (Title, Status, etc.)
    setProject(projRes.data);
    
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

  } catch (err) {
    console.error("Error loading project details", err);
    // Safety fallback to prevent UI from breaking
    setMilestones([]);
    setTasks([]);
  }
};
  if (!project) return <div className="p-10">Loading Project...</div>;

  return (
    <div className="space-y-8">
      {/* Project Header */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold mb-4">{project.title}</h1>
        <p className="text-gray-600 leading-relaxed">{project.description}</p>
        <div className="mt-6 flex gap-4">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
            Status: {project.status || 'Active'}
          </span>
        </div>
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
    </div>
  );
};

export default ProjectDetails;