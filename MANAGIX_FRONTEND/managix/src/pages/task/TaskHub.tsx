import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { milestoneService } from '../../api/milestoneService';
import { FiSearch, FiTarget, FiFolder, FiChevronRight } from 'react-icons/fi';

const TaskHub = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loadingMilestones, setLoadingMilestones] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch all projects for selection
        api.get('/projects').then(res => {
            setProjects(res.data);
            setFilteredProjects(res.data);
        }).catch(err => console.error("Error fetching projects", err));
    }, []);

    // Handle Project Search
    useEffect(() => {
        const filtered = projects.filter(p => 
            (p.title || p.Title || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProjects(filtered);
    }, [searchTerm, projects]);

    const handleProjectSelect = async (projectId: string) => {
        setSelectedProjectId(projectId);
        setLoadingMilestones(true);
        try {
            const data = await milestoneService.getByProject(projectId);
            setMilestones(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching milestones", err);
        } finally {
            setLoadingMilestones(false);
        }
    };

    const handleMilestoneSelect = (milestoneId: string) => {
        // Navigates to the task list for that specific project and milestone
        navigate(`/projects/${selectedProjectId}/milestones/${milestoneId}/tasks`);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto min-h-screen bg-gray-50/30">
            <h1 className="text-4xl font-black mb-8 tracking-tighter italic">TASK EXPLORER</h1>
            
            <div className="grid md:grid-cols-2 gap-8">
                {/* Step 1: Project Selection */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-[600px]">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">1. Select Project</h3>
                    <div className="relative mb-6 px-2">
                        <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search projects..." 
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                        {filteredProjects.map(p => {
                            const pId = p.projectId || p.ProjectId;
                            return (
                                <button 
                                    key={pId}
                                    onClick={() => handleProjectSelect(pId)}
                                    className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${
                                        selectedProjectId === pId ? 'bg-black text-white shadow-xl' : 'hover:bg-gray-50 text-gray-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FiFolder className={selectedProjectId === pId ? 'text-white' : 'text-gray-400'} />
                                        <span className="font-bold text-sm">{p.title || p.Title}</span>
                                    </div>
                                    <FiChevronRight className={`transition-transform ${selectedProjectId === pId ? 'translate-x-1' : 'opacity-0'}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Step 2: Milestone Selection */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-[600px]">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">2. Select Milestone</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {!selectedProjectId ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <FiFolder size={48} className="mb-4 opacity-10" />
                                <p className="font-bold">Select a project first</p>
                            </div>
                        ) : loadingMilestones ? (
                            <p className="text-center py-10 text-sm text-gray-400">Loading milestones...</p>
                        ) : milestones.length > 0 ? (
                            milestones.map(m => (
                                <button 
                                    key={m.milestoneId || m.MilestoneId}
                                    onClick={() => handleMilestoneSelect(m.milestoneId || m.MilestoneId)}
                                    className="w-full p-5 border-2 border-gray-50 rounded-[2rem] flex flex-col gap-2 hover:border-black transition-all text-left group"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-black text-indigo-600 uppercase tracking-tighter">Milestone</span>
                                        <FiTarget className="text-gray-300 group-hover:text-black transition-colors" />
                                    </div>
                                    <span className="font-black text-gray-900 text-lg leading-tight">{m.title || m.Title}</span>
                                    <span className="text-[10px] bg-gray-100 self-start px-2 py-1 rounded-full font-bold text-gray-500">{m.status || m.Status}</span>
                                </button>
                            ))
                        ) : (
                            <p className="text-center py-10 text-sm text-gray-400 font-bold">No milestones found for this project.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskHub;