import React, { useEffect, useState } from 'react';
import { performanceService } from '../api/performanceService';
import { projectService } from '../api/projectService';
import { useParams } from 'react-router-dom';

interface Performance {
  employeeId: string;
  projectId: string;
  tasksAssigned: number;
  tasksCompleted: number;
  approvalRate: number;
  employeeName?: string; // We'll map this locally
}

const PerformanceDashboard = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole') || '';
  const currentUserId = localStorage.getItem('userId') || '';
  const [performanceData, setPerformanceData] = useState<Performance[]>([]);
  const [projectTitle, setProjectTitle] = useState("Loading Project...");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadInitialData();
    }
  }, [projectId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const project = await projectService.getById(projectId!);
      setProjectTitle(project?.title ?? "Project Performance");

      let rows = await fetchPerformanceRows();
      const filtered =
        role === 'Employee' && currentUserId
          ? rows.filter(
              (r) => String(r.employeeId).toLowerCase() === String(currentUserId).toLowerCase()
            )
          : rows;
      setPerformanceData(filtered);
    } catch (err) {
      console.error("Error loading project context:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceRows = async (): Promise<Performance[]> => {
    try {
      const data = await performanceService.getProjectPerformance(projectId!);
      return (Array.isArray(data) ? data : []).map((emp: any) => ({
        employeeId: String(emp.employeeId ?? emp.EmployeeId ?? ''),
        projectId: String(emp.projectId ?? emp.ProjectId ?? ''),
        tasksAssigned: Number(emp.tasksAssigned ?? emp.TasksAssigned ?? 0),
        tasksCompleted: Number(emp.tasksCompleted ?? emp.TasksCompleted ?? 0),
        approvalRate: Number(emp.approvalRate ?? emp.ApprovalRate ?? 0),
        employeeName: emp.employeeName ?? emp.EmployeeName ?? 'Team member',
      }));
    } catch {
      return [];
    }
  };

  const loadPerformanceRecords = async () => {
    setPerformanceData(await fetchPerformanceRows());
  };

  // SCENARIO 9 FIX: Automated "Sync" to trigger the backend calculation
const handleCalculatePerformance = async () => {
    setSyncing(true);
    try {
        // 1. Trigger the EXISTING bulk recalculation endpoint
        // This matches: [POST] http://localhost:7005/api/performance/recalculate/{projectId}
        await performanceService.recalculateProject(projectId!);

        alert("Project performance metrics recalculated successfully!");
        
        // 2. Refresh the UI data
        await loadPerformanceRecords();
    } catch (err: any) {
        console.error("Recalculation failed:", err);
        const errorMsg = err.response?.data?.message || "Ensure a team is assigned to the project.";
        alert(`Failed to calculate performance: ${errorMsg}`);
    } finally {
        setSyncing(false);
    }
};

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Analytics...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">
            {projectTitle}
          </h1>
          <p className="text-fg-muted text-sm mt-1">AI-calculated productivity metrics for your assigned team.</p>
        </div>

        {role !== 'Employee' && (
        <button
          onClick={handleCalculatePerformance}
          disabled={syncing}
          className={`px-6 py-3 rounded-lg font-bold transition-all shadow-e2 ${
            syncing ? 'bg-surface-3' : 'bg-primary text-primary-fg hover:bg-primary-hover active:scale-95'
          }`}
        >
          {syncing ? "Calculating..." : "🔄 Recalculate Team Scores"}
        </button>
        )}
      </div>

      {performanceData.length === 0 ? (
        <div className="bg-surface-2 border-2 border-dashed border-line rounded-xl p-20 text-center">
          <p className="text-fg-subtle text-lg">No performance records found in the database.</p>
          <button
            onClick={handleCalculatePerformance}
            className="mt-4 text-primary font-bold hover:underline"
          >
            Click here to calculate scores for the current team members.
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {performanceData.map((emp) => (
            <div key={emp.employeeId} className="bg-surface p-6 rounded-xl border border-line shadow-e1 hover:shadow-e2 transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-fg">{emp.employeeName}</h3>
                <span className="text-[10px] bg-surface-2 px-2 py-1 rounded text-fg-muted uppercase tracking-tighter">
                  ID: {emp.employeeId.substring(0, 8)}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-fg-muted">Approval Rate</span>
                    <span className="font-bold text-primary">{emp.approvalRate}%</span>
                  </div>
                  <div className="w-full bg-surface-3 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-2 transition-all duration-1000"
                      style={{ width: `${emp.approvalRate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-surface-2 p-3 rounded-lg text-center">
                    <p className="text-[10px] text-fg-subtle uppercase font-bold">Assigned</p>
                    <p className="text-xl font-bold">{emp.tasksAssigned}</p>
                  </div>
                  <div className="bg-surface-2 p-3 rounded-lg text-center">
                    <p className="text-[10px] text-fg-subtle uppercase font-bold">Completed</p>
                    <p className="text-xl font-bold">{emp.tasksCompleted}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;