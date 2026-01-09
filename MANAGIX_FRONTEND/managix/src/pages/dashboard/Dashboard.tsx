import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('Member');
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const storedRole = localStorage.getItem('userRole');
    const storedId = localStorage.getItem('userId');

    if (storedName) setUserName(storedName);
    if (storedRole) setUserRole(storedRole);
    if (storedId) setUserId(storedId);

    // Initial fetch
    fetchDashboardData(storedRole, storedId);
  }, []);

  const fetchDashboardData = async (role: string | null, id: string | null) => {
    // Basic validation to prevent unnecessary API calls
    if (!id || !role) {
        setLoading(false);
        return;
    }
    
    try {
      setLoading(true);
      
     // ADD THIS SECTION: Admin logic
    if (role === 'Admin') {
      // Call the endpoint that returns ALL projects
      const response = await api.get('/projects'); 
      setProjects(Array.isArray(response.data) ? response.data : []);
    } 
    else if (role === 'Manager') {
      const response = await api.get(`/projects/manager/${id}`);
      setProjects(Array.isArray(response.data) ? response.data : []);
    }
      else if (role === 'Employee') {
        // This call requires the 'userId' header in your axiosInstance interceptor
        const tasksResponse = await api.get('/tasks/assigned-to-me');
        const tasks = tasksResponse.data || [];
        
        // FIX: Extract project IDs using both camelCase and PascalCase to match C# serialization
        const projectIds: string[] = [...new Set(tasks.map((t: any) => t.projectId || t.ProjectId))].filter(Boolean) as string[];
        
        if (projectIds.length > 0) {
          const projectDetails = await Promise.all(
            projectIds.map(projId => 
              api.get(`/projects/${projId}`)
                .then(res => res.data)
                .catch(err => {
                  console.error(`Failed to fetch project ${projId}`, err);
                  return null;
                })
            )
          );
          // Filter out any projects that failed to load
          setProjects(projectDetails.filter(p => p !== null));
        } else {
          setProjects([]);
        }
      }

      else if (role === 'QA') {
    const userId = localStorage.getItem('userId');
    
    // 1. Get all teams this QA belongs to
    const myTeamsResponse = await api.get(`/teams/user/${userId}`);
    const myTeams = myTeamsResponse.data || [];

    // 2. Get the Projects associated with those teams
    const projectPromises = myTeams.map((team: any) => 
        api.get(`/projects/team/${team.TeamId}`)
    );
    
    const projectResults = await Promise.all(projectPromises);
    const assignedProjects = projectResults.flatMap(res => res.data);
    
    // 3. Remove duplicates and set state
    const uniqueProjects = Array.from(new Map(assignedProjects.map(p => [p.ProjectId, p])).values());
    setProjects(uniqueProjects);
}

      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-xl font-semibold">Loading your projects...</div>;

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Welcome, {userName}</h1>
        <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Access Level:</span>
            <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {userRole}
            </span>
        </div>
      </header>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Your Current Projects</h2>
      </div>
      
      {projects.length === 0 ? (
        <div className="bg-gray-50 p-16 text-center rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 text-lg">No projects are currently linked to your account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.projectId || project.ProjectId}
              onClick={() => navigate(`/projects/${project.projectId || project.ProjectId}`)}
              className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-200 cursor-pointer hover:border-black hover:shadow-md transition-all duration-200 flex flex-col h-full"
            >
              <h3 className="text-lg font-bold mb-2 group-hover:text-blue-600 transition-colors">
                {project.title || project.Title}
              </h3>
              <p className="text-gray-500 text-sm line-clamp-3 mb-6">
                {project.description || project.Description || 'No description provided.'}
              </p>
              
              <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                    (project.status || project.Status) === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {project.status || project.Status || 'Active'}
                </span>
                <span className="text-black text-sm font-semibold group-hover:translate-x-1 transition-transform">
                  View →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;