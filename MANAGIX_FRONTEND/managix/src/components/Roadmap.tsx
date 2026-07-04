import React, { useEffect, useState } from "react";
import { adminService } from "../api/adminService";
import { FiFlag, FiCheckCircle, FiClock } from "react-icons/fi";

interface Props {
  projectId: string;
}

const Roadmap: React.FC<Props> = ({ projectId }) => {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoadmap();
  }, [projectId]);

  const fetchRoadmap = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAdminProjectDetailPage(projectId);
      setProject(data);
    } catch (error) {
      console.error("Failed to load roadmap", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-fg-subtle font-bold">
        Loading roadmap...
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="bg-surface rounded-xl p-8 shadow-e1 border border-line">
      {/* PROJECT HEADER */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-fg mb-2">
          {project.Title}
        </h2>
        <p className="text-fg-muted mb-4">{project.Description}</p>

        <div className="flex flex-wrap gap-6 text-sm font-bold text-fg-muted">
          <span>Status: {project.Status}</span>
          <span>Deadline: {new Date(project.Deadline).toLocaleDateString()}</span>
          <span>Budget: ${project.Budget}</span>
        </div>
      </div>

      {/* ROADMAP */}
      <div className="relative pl-8 border-l-4 border-primary-border space-y-10">
        {project.Milestones.map((milestone: any, index: number) => (
          <div key={milestone.MilestoneId} className="relative">
            {/* MILESTONE DOT */}
            <div className="absolute -left-[38px] top-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-fg">
              <FiFlag size={14} />
            </div>

            {/* MILESTONE CARD */}
            <div className="bg-primary-soft rounded-xl p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-fg">
                  {milestone.Title}
                </h3>
                <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-surface text-fg-muted border border-line">
                  {milestone.Status}
                </span>
              </div>

              <p className="text-sm text-fg-muted mb-4">
                Deadline: {new Date(milestone.Deadline).toLocaleDateString()}
              </p>

              {/* TASKS */}
              <div className="space-y-2">
                {project.Tasks
                  .filter((t: any) => t.Title === milestone.Title)
                  .map((task: any) => (
                    <div
                      key={task.TaskId}
                      className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-line"
                    >
                      {task.Status === "Done" ? (
                        <FiCheckCircle className="text-success" />
                      ) : (
                        <FiClock className="text-warning" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-sm text-fg">{task.Title}</p>
                        <p className="text-xs text-fg-subtle">{task.Status}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Roadmap;
