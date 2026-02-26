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
      <div className="py-20 text-center text-gray-400 font-bold italic">
        Loading roadmap...
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
      {/* PROJECT HEADER */}
      <div className="mb-10">
        <h2 className="text-3xl font-black text-gray-900 mb-2">
          {project.Title}
        </h2>
        <p className="text-gray-500 mb-4">{project.Description}</p>

        <div className="flex flex-wrap gap-6 text-sm font-bold">
          <span>Status: {project.Status}</span>
          <span>Deadline: {new Date(project.Deadline).toLocaleDateString()}</span>
          <span>Budget: ${project.Budget}</span>
        </div>
      </div>

      {/* ROADMAP */}
      <div className="relative pl-8 border-l-4 border-indigo-100 space-y-10">
        {project.Milestones.map((milestone: any, index: number) => (
          <div key={milestone.MilestoneId} className="relative">
            {/* MILESTONE DOT */}
            <div className="absolute -left-[38px] top-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
              <FiFlag size={14} />
            </div>

            {/* MILESTONE CARD */}
            <div className="bg-indigo-50 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-black text-indigo-900">
                  {milestone.Title}
                </h3>
                <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-white">
                  {milestone.Status}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Deadline: {new Date(milestone.Deadline).toLocaleDateString()}
              </p>

              {/* TASKS */}
              <div className="space-y-2">
                {project.Tasks
                  .filter((t: any) => t.Title === milestone.Title)
                  .map((task: any) => (
                    <div
                      key={task.TaskId}
                      className="flex items-center gap-3 bg-white rounded-xl p-3 border"
                    >
                      {task.Status === "Done" ? (
                        <FiCheckCircle className="text-emerald-600" />
                      ) : (
                        <FiClock className="text-amber-500" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-sm">{task.Title}</p>
                        <p className="text-xs text-gray-400">{task.Status}</p>
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
