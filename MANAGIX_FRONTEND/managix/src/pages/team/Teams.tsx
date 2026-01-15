import React, { useState, useEffect } from 'react';
import { teamService } from '../../api/teamService';
import { projectService } from '../../api/projectService';
import { milestoneService } from '../../api/milestoneService';
import { taskService } from '../../api/taskService';
import api from '../../api/axiosInstance';
import { 
    FiUsers, FiPlus, FiUserPlus, FiBriefcase, 
    FiChevronRight, FiX, FiCheckCircle, FiClock,
    FiTrash2, FiSearch, FiInfo
} from 'react-icons/fi';

interface Project {
    ProjectId: string;
    
    Title: string;
}

interface Team {
    TeamId: string;
    Name: string;
    ProjectTitle?: string;
    ProjectId?: string;
    members?: any[];
}

const Teams = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [teamName, setTeamName] = useState("");
    const [selectedTeamForMember, setSelectedTeamForMember] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState("");

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [activeTeam, setActiveTeam] = useState<Team | null>(null);
    const [hierarchy, setHierarchy] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const storedId = localStorage.getItem('userId');
            const storedRole = localStorage.getItem('userRole');

            const [teamsRes, usersRes] = await Promise.all([
                teamService.getAllTeams(),
                api.get('/users')
            ]);

            // GUIDs in Uppercase for standard comparison
            const EMPLOYEE_ROLE_ID = "A08BB9EB-B222-4B4E-965F-980F88540E97".toUpperCase();
            const QA_ROLE_ID = "B27CB81B-0693-4259-81EC-48D3918BA176".toUpperCase();

            console.log("Raw API Response Users:", usersRes.data);

            const assignableUsers = (usersRes.data || []).filter((user: any) => {
                // Check all possible property names your backend might use
                const rawId = user.RoleId || user.roleId || user.RoleID || user.idRole || user.Role;
                
                if (!rawId) return false;

                const normalizedId = String(rawId).toUpperCase();
                const isMatch = normalizedId === EMPLOYEE_ROLE_ID || normalizedId === QA_ROLE_ID;
                
                if(isMatch) console.log(`Match found for: ${user.FullName}`);
                return isMatch;
            });

            console.log("Filtered Users for Dropdown:", assignableUsers);

            let projectsData = [];
            if (storedRole === 'Manager' && storedId) {
                const response = await api.get(`/projects/manager/${storedId}`);
                projectsData = Array.isArray(response.data) ? response.data : [];
            } else {
                projectsData = await projectService.getAll();
            }

            setTeams(teamsRes || []);
            setEmployees(assignableUsers); 
            setProjects(projectsData || []);
        } catch (error) { 
            console.error("Error loading team data:", error); 
        }
    };

    const handleTeamClick = async (team: Team) => {
        setIsPanelOpen(true);
        setLoadingDetails(true);
        setHierarchy([]);
        setTeamMembers([]);
        
        try {
            const teamResponse = await api.get(`/teams/${team.TeamId}`);
            const freshTeamData = teamResponse.data;
            setActiveTeam(freshTeamData);

            const members = await teamService.getTeamMembers(team.TeamId);
            setTeamMembers(members || []);

            const project = projects.find(p => 
                (freshTeamData.ProjectId && p.ProjectId === freshTeamData.ProjectId) || 
                (p.Title === freshTeamData.ProjectTitle)
            );

            if (project) {
                const milestones = await milestoneService.getByProject(project.ProjectId);
                const fullHierarchy = await Promise.all(milestones.map(async (m: any) => {
                    const tasks = await taskService.getByMilestone(m.MilestoneId || m.milestoneId);
                    return { ...m, tasks };
                }));
                setHierarchy(fullHierarchy);
            }
        } catch (error) { 
            console.error("Error loading team details:", error); 
        } finally { 
            setLoadingDetails(false); 
        }
    };

    const handleDeleteTeam = async (e: React.MouseEvent, teamId: string) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this team?")) return;
        try {
            await api.delete(`/teams/${teamId}`);
            loadData();
        } catch (err) { alert("Error deleting team"); }
    };

    const handleCreateTeam = async () => {
        if (!teamName) return;
        try {
            await teamService.createTeam(teamName);
            setTeamName("");
            loadData();
        } catch (err) { alert("Error creating team"); }
    };

    const handleAddMember = async () => {
        if (!selectedTeamForMember || !selectedEmployee) return;
        try {
            await teamService.addEmployeeToTeam(selectedTeamForMember, selectedEmployee);
            setSelectedEmployee(""); 
            loadData();
            alert("Member added successfully");
        } catch (err) { alert("Error adding member"); }
    };

    const handleRemoveMember = async (employeeId: string) => {
        if (!activeTeam) return;
        if (!window.confirm("Remove this member from the team?")) return;
        
        try {
            await teamService.removeEmployeeFromTeam(activeTeam.TeamId, employeeId);
            const updatedMembers = await teamService.getTeamMembers(activeTeam.TeamId);
            setTeamMembers(updatedMembers || []);
            loadData();
        } catch (err) {
            alert("Error removing member");
        }
    };

    const handleAssignToProject = async (teamId: string, projectId: string) => {
        try {
            await teamService.assignTeamToProject(teamId, projectId);
            await loadData();
        } catch (err: any) { alert("Assignment Error"); }
    };

    const getEmployeeName = (empId: string) => {
        // Search in the filtered list
        const emp = employees.find(e => (e.Id || e.UserId || e.id) === empId);
        return emp ? emp.FullName : "Unassigned";
    };

    const filteredTeams = teams.filter(t => 
        t.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ProjectTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
                            <FiUsers className="text-indigo-600" /> Team Hub
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">Manage your workforce and project distribution</p>
                    </div>
                    
                    <div className="relative group w-full md:w-96">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Search teams or projects..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-200 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Create Team Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <FiPlus size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">New Operational Team</h2>
                        </div>
                        <div className="flex gap-3">
                            <input 
                                className="flex-1 bg-gray-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
                                placeholder="Enter team name..." 
                                value={teamName} 
                                onChange={(e) => setTeamName(e.target.value)} 
                            />
                            <button onClick={handleCreateTeam} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95">
                                Create
                            </button>
                        </div>
                    </div>

                    {/* Member Assignment Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <FiUserPlus size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">Assign Member</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <select 
                                className="bg-gray-50 border-none p-4 rounded-2xl outline-none cursor-pointer font-medium" 
                                value={selectedTeamForMember} 
                                onChange={(e) => setSelectedTeamForMember(e.target.value)}
                            >
                                <option value="">Select Team</option>
                                {teams.map((t: any) => <option key={t.TeamId} value={t.TeamId}>{t.Name}</option>)}
                            </select>
                            <select 
                                className="bg-gray-50 border-none p-4 rounded-2xl outline-none cursor-pointer font-medium" 
                                value={selectedEmployee} 
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                            >
                                <option value="">Select Member (Emp/QA)</option>
                                {employees.length > 0 ? (
                                    employees.map((e: any) => (
                                        <option key={e.Id || e.UserId || e.id} value={e.Id || e.UserId || e.id}>
                                            {e.FullName}
                                        </option>
                                    ))
                                ) : (
                                    <option disabled>No Employees/QA found</option>
                                )}
                            </select>
                        </div>
                        <button onClick={handleAddMember} className="w-full mt-4 bg-gray-900 text-white p-4 rounded-2xl font-bold hover:bg-black transition-all active:scale-[0.98]">
                            Add to Team
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-gray-800">Operational Teams</h2>
                    <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                        {filteredTeams.length} Teams
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredTeams.map((team: any) => (
                        <div
                            key={team.TeamId}
                            onClick={() => handleTeamClick(team)}
                            className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden"
                        >
                            <FiUsers className="absolute -bottom-4 -right-4 text-gray-50 size-32 group-hover:text-indigo-50 transition-colors pointer-events-none" />
                            
                            <div className="relative">
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors pr-8">
                                        {team.Name}
                                    </h3>
                                    <button 
                                        onClick={(e) => handleDeleteTeam(e, team.TeamId)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>

                                <div className="bg-indigo-50/50 rounded-2xl p-4 mb-6">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">Assigned Project</span>
                                    <div className="flex items-center gap-2 text-indigo-900 font-bold">
                                        <FiBriefcase size={14} />
                                        <p className="truncate">{team.ProjectTitle || "Not Assigned"}</p>
                                    </div>
                                </div>

                                <div onClick={(e) => e.stopPropagation()}>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2 px-1">Quick Reassign</label>
                                    <select 
                                        onChange={(e) => handleAssignToProject(team.TeamId, e.target.value)}
                                        className="w-full bg-gray-50 border-none p-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Change Project...</option>
                                        {projects.map((p: any) => <option key={p.ProjectId} value={p.ProjectId}>{p.Title}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Workflow Modal */}
            {isPanelOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setIsPanelOpen(false)} />
                    
                    <div className="relative w-full max-w-2xl bg-white max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <p className="text-indigo-600 font-black text-xs uppercase tracking-widest mb-1">Team Overview</p>
                                <h2 className="text-3xl font-black text-gray-900">{activeTeam?.Name}</h2>
                                {activeTeam?.ProjectTitle && (
                                    <p className="text-sm text-gray-500 font-bold">Project: {activeTeam.ProjectTitle}</p>
                                )}
                            </div>
                            <button onClick={() => setIsPanelOpen(false)} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-colors">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 gap-4">
                                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                    <p className="font-bold text-gray-400 italic">Syncing with database...</p>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <FiUsers className="text-indigo-600" />
                                            <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Team Members ({teamMembers.length})</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {teamMembers.length > 0 ? (
                                                teamMembers.map((member: any) => (
                                                    <div key={member.Id || member.UserId || member.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 pl-4 pr-2 py-2 rounded-2xl group/member">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">
                                                            {member.FullName?.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-700">{member.FullName}</span>
                                                        <button 
                                                            onClick={() => handleRemoveMember(member.Id || member.UserId || member.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <FiX size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-gray-400 font-medium italic px-2">No members assigned.</p>
                                            )}
                                        </div>
                                    </section>

                                    <hr className="border-gray-50" />

                                    <section>
                                        <div className="flex items-center gap-2 mb-6">
                                            <FiBriefcase className="text-indigo-600" />
                                            <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest">Project Roadmap</h3>
                                        </div>

                                        {hierarchy.length === 0 ? (
                                            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                                <FiInfo className="mx-auto text-gray-300 mb-4" size={40} />
                                                <p className="text-gray-400 font-bold italic">No roadmap found.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-10">
                                                {hierarchy.map((milestone, idx) => (
                                                    <div key={milestone.MilestoneId || milestone.milestoneId} className="relative">
                                                        {idx !== hierarchy.length - 1 && (
                                                            <div className="absolute left-6 top-12 bottom-[-40px] w-0.5 bg-indigo-50" />
                                                        )}
                                                        <div className="flex gap-6">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-indigo-100 z-10">
                                                                {milestone.Status === 'Completed' ? <FiCheckCircle size={20} /> : <FiClock size={20} />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-4 pt-2">
                                                                    <h4 className="font-black text-gray-900 text-lg leading-tight">{milestone.Title || milestone.title}</h4>
                                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                                                                        milestone.Status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                                                                    }`}>
                                                                        {milestone.Status}
                                                                    </span>
                                                                </div>
                                                                <div className="grid gap-3">
                                                                    {milestone.tasks?.map((task: any) => (
                                                                        <div key={task.TaskId} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex justify-between items-center">
                                                                            <div>
                                                                                <p className="font-bold text-gray-800 text-sm">{task.Title}</p>
                                                                                <div className="flex items-center gap-3 mt-2">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-[8px] font-bold text-blue-700 uppercase">
                                                                                            {getEmployeeName(task.AssignedEmployeeId).charAt(0)}
                                                                                        </div>
                                                                                        <p className="text-[11px] font-medium text-gray-500">{getEmployeeName(task.AssignedEmployeeId)}</p>
                                                                                    </div>
                                                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase border ${
                                                                                        task.Status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                                                    }`}>
                                                                                        {task.Status || 'In Progress'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <FiChevronRight className="text-gray-300" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Teams;