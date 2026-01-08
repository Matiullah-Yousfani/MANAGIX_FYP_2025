import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { projectService } from "../../api/projectService";

interface DashboardData {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalMilestones: number;
  completedMilestones: number;
  progressPercentage: number;
}

const ProjectDashboard = () => {
  const { projectId } = useParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    projectService
      .getProjectDashboard(projectId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <p className="text-center mt-10">Loading dashboard...</p>;
  if (!data) return <p className="text-center mt-10">No data found</p>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Project Dashboard</h1>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-6">
        <DashboardCard title="Total Tasks" value={data.totalTasks} />
        <DashboardCard title="Completed Tasks" value={data.completedTasks} />
        <DashboardCard title="Pending Tasks" value={data.pendingTasks} />
        <DashboardCard title="Total Milestones" value={data.totalMilestones} />
        <DashboardCard title="Completed Milestones" value={data.completedMilestones} />
      </div>

      {/* PROGRESS BAR */}
      <div className="mt-10">
        <p className="font-semibold mb-2">Overall Progress</p>
        <div className="w-full bg-gray-200 h-4 rounded">
          <div
            className="bg-green-600 h-4 rounded"
            style={{ width: `${data.progressPercentage}%` }}
          />
        </div>
        <p className="mt-2">{data.progressPercentage}% Complete</p>
      </div>
    </div>
  );
};

const DashboardCard = ({ title, value }: { title: string; value: number }) => (
  <div className="bg-white shadow rounded p-4">
    <p className="text-gray-600">{title}</p>
    <h2 className="text-2xl font-bold">{value}</h2>
  </div>
);

export default ProjectDashboard;
