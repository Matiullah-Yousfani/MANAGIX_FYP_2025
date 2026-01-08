import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

const Projects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '' });

  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('userRole');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get(`/projects/manager/${userId}`);
      setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects");
    }
  };

  const handleSelectProject = (projectId: string) => {
    localStorage.setItem('lastViewedProjectId', projectId);
    navigate(`/performance/${projectId}`);
  };

  // Logic to handle closing the project
  const handleCloseProject = async (projectId: string) => {
    if (window.confirm("Are you sure you want to close this project? This will mark it as Completed.")) {
      try {
        await api.post(`/projects/${projectId}/close`, { comment: "Closed by Manager" });
        fetchProjects(); // Refresh the list to show updated status
      } catch (err) {
        alert("Failed to close project");
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/projects/create', {
        managerId: userId,
        ...newProject
      });
      setShowModal(false);
      setNewProject({ title: '', description: '' });
      fetchProjects();
    } catch (err) {
      alert("Error creating project");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Projects</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Project Title</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600 text-center">View</th>
              <th className="p-4 font-semibold text-gray-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr>
                <td colSpan={4} className="p-10 text-center text-gray-400">No projects found.</td>
              </tr>
            )}
            {projects.map(p => {
              const pId = p.projectId || p.ProjectId;
              const isClosed = p.isClosed || p.IsClosed || p.status === "Completed" || p.Status === "Completed";
              
              return (
                <tr key={pId} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="p-4 font-medium">
                    {p.title || p.Title || "Untitled Project"}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      isClosed ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {p.status || p.Status || 'Active'}
                    </span>
                  </td>
                  
                  {/* Column 1: Navigation */}
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleSelectProject(pId)}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 transition flex items-center justify-center gap-1 mx-auto"
                    >
                      View Details
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>

                  {/* Column 2: Close Action */}
                  <td className="p-4 text-center">
                    {!isClosed ? (
                      <button
                        onClick={() => handleCloseProject(pId)}
                        className="text-xs font-bold bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                      >
                        Close Project
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 italic font-medium">Project Completed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Create New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Project Name</label>
                <input
                  className="w-full mt-1 p-3 border rounded-xl focus:ring-2 focus:ring-black outline-none"
                  placeholder="e.g. Website Redesign"
                  required
                  onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                <textarea
                  className="w-full mt-1 p-3 border rounded-xl h-32 focus:ring-2 focus:ring-black outline-none"
                  placeholder="Describe the project goals..."
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-black text-white p-3 rounded-xl font-bold hover:bg-gray-800 transition">Launch Project</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-600 p-3 rounded-xl font-bold hover:bg-gray-200 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;