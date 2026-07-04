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
        <div className="p-8 max-w-5xl mx-auto min-h-screen bg-bg">
            <h1 className="text-2xl font-bold mb-8 tracking-tighter">TASK EXPLORER</h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Step 1: Project Selection */}
                <div className="bg-surface p-6 rounded-xl shadow-e1 border border-line flex flex-col h-[600px]">
                    <h3 className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest mb-4 px-2">1. Select Project</h3>
                    <div className="relative mb-6 px-2">
                        <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-fg-subtle" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="w-full pl-12 pr-4 py-3 bg-surface-2 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
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
                                    className={`w-full text-left p-4 rounded-lg transition-all flex items-center justify-between group ${
                                        selectedProjectId === pId ? 'bg-primary text-primary-fg shadow-e2' : 'hover:bg-surface-3 text-fg-muted'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FiFolder className={selectedProjectId === pId ? 'text-primary-fg' : 'text-fg-subtle'} />
                                        <span className="font-bold text-sm">{p.title || p.Title}</span>
                                    </div>
                                    <FiChevronRight className={`transition-transform ${selectedProjectId === pId ? 'translate-x-1' : 'opacity-0'}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Step 2: Milestone Selection */}
                <div className="bg-surface p-6 rounded-xl shadow-e1 border border-line flex flex-col h-[600px]">
                    <h3 className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest mb-4 px-2">2. Select Milestone</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {!selectedProjectId ? (
                            <div className="h-full flex flex-col items-center justify-center text-fg-subtle">
                                <FiFolder size={48} className="mb-4 opacity-10" />
                                <p className="font-bold">Select a project first</p>
                            </div>
                        ) : loadingMilestones ? (
                            <p className="text-center py-10 text-sm text-fg-subtle">Loading milestones...</p>
                        ) : milestones.length > 0 ? (
                            milestones.map(m => (
                                <button
                                    key={m.milestoneId || m.MilestoneId}
                                    onClick={() => handleMilestoneSelect(m.milestoneId || m.MilestoneId)}
                                    className="w-full p-5 border-2 border-line rounded-xl flex flex-col gap-2 hover:border-primary transition-all text-left group"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-primary uppercase tracking-tighter">Milestone</span>
                                        <FiTarget className="text-fg-subtle group-hover:text-primary transition-colors" />
                                    </div>
                                    <span className="font-bold text-fg text-lg leading-tight">{m.title || m.Title}</span>
                                    <span className="text-[10px] bg-surface-2 self-start px-2 py-1 rounded-full font-bold text-fg-muted">{m.status || m.Status}</span>
                                </button>
                            ))
                        ) : (
                            <p className="text-center py-10 text-sm text-fg-subtle font-bold">No milestones found for this project.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskHub;