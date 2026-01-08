import React, { useEffect, useState } from 'react';
import { performanceService } from '../api/performanceService';
import { projectService } from '../api/projectService';
import { teamService } from '../api/teamService';
import { useParams, Link } from 'react-router-dom';

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
      // 1. Fetch Project Details to get the Title (Scenario Alignment)
      const project = await projectService.getById(projectId!);
      setProjectTitle(project.Title || "Project Performance");

      // 2. Load existing performance data
      await loadPerformanceRecords();
    } catch (err) {
      console.error("Error loading project context:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceRecords = async () => {
    try {
      const data = await performanceService.getProjectPerformance(projectId!);
      
      // Map backend PascalCase to frontend camelCase
      const mappedData = (Array.isArray(data) ? data : []).map(emp => ({
        employeeId: emp.EmployeeId,
        projectId: emp.ProjectId,
        tasksAssigned: emp.TasksAssigned,
        tasksCompleted: emp.TasksCompleted,
        approvalRate: emp.ApprovalRate
      }));

      setPerformanceData(mappedData);
    } catch (err) {
      setPerformanceData([]);
    }
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
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {projectTitle}
          </h1>
          <p className="text-gray-500 text-sm mt-1">AI-calculated productivity metrics for your assigned team.</p>
        </div>
        
        <button 
          onClick={handleCalculatePerformance}
          disabled={syncing}
          className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
            syncing ? 'bg-gray-400' : 'bg-black text-white hover:scale-105 active:scale-95'
          }`}
        >
          {syncing ? "Calculating..." : "🔄 Recalculate Team Scores"}
        </button>
      </div>

      {performanceData.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
          <p className="text-gray-400 text-lg">No performance records found in the database.</p>
          <button 
            onClick={handleCalculatePerformance}
            className="mt-4 text-blue-600 font-bold hover:underline"
          >
            Click here to calculate scores for the current team members.
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {performanceData.map((emp) => (
            <div key={emp.employeeId} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-800">Team Member</h3>
                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase tracking-tighter">
                  ID: {emp.employeeId.substring(0, 8)}
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Approval Rate</span>
                    <span className="font-bold text-blue-600">{emp.approvalRate}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2 transition-all duration-1000" 
                      style={{ width: `${emp.approvalRate}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-gray-50 p-3 rounded-xl text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Assigned</p>
                    <p className="text-xl font-black">{emp.tasksAssigned}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Completed</p>
                    <p className="text-xl font-black">{emp.tasksCompleted}</p>
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