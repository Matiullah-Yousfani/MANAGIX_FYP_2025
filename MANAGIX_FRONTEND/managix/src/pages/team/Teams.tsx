import React, { useState, useEffect } from 'react';
import AiAllocation from '../ai/AiAllocation';
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
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import ToastStack, { useToast } from '../../components/ToastStack';

interface Project {
    ProjectId: string;
    
    Title: string;
}

interface Team {
    TeamId: string;
    Name: string;
    ProjectTitle?: string;
    ProjectId?: string;
    CreatedBy?: string;
    MemberCount?: number;
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
    const [memberActiveTasks, setMemberActiveTasks] = useState<Record<string, number>>({});
    const [qaPendingReviewCount, setQaPendingReviewCount] = useState(0);
    const [activeTeamCreator, setActiveTeamCreator] = useState('');
    const [activeTeamCreatorId, setActiveTeamCreatorId] = useState('');
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [deleteTeamTarget, setDeleteTeamTarget] = useState<any>(null);
    const [removeMemberTarget, setRemoveMemberTarget] = useState<any>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const { toasts, push: pushToast } = useToast();

    const QA_ROLE_ID = "8DA96376-659A-40B2-A3D4-34165984E90F".toUpperCase();

    const resolveRole = (member: any, creatorId?: string) => {
        const mid = String(member.userId ?? member.UserId ?? member.Id ?? member.id ?? '');
        if (member.isTeamCreator || (creatorId && mid === String(creatorId))) return 'Manager';
        const rn = String(member.roleName ?? member.RoleName ?? '');
        if (rn.toLowerCase().includes('quality') || rn === 'QA') return 'QA';
        if (rn.toLowerCase().includes('manager')) return 'Manager';
        const rid = String(member.roleId ?? member.RoleId ?? '').toUpperCase();
        if (rid === QA_ROLE_ID) return 'QA';
        return 'Employee';
    };

    const isManagerMember = (member: any, creatorId?: string) =>
        resolveRole(member, creatorId) === 'Manager';

    const isQaMember = (member: any, creatorId?: string) =>
        resolveRole(member, creatorId) === 'QA';

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const storedId = localStorage.getItem('userId');
            const storedRole = localStorage.getItem('userRole');

            const managerId =
                storedRole === 'Manager' && storedId ? storedId : undefined;
            const [teamsRes, usersRes] = await Promise.all([
                teamService.getAllTeams(managerId),
                api.get('/users')
            ]);

            // GUIDs in Uppercase for standard comparison
            const EMPLOYEE_ROLE_ID = "90E6C731-B51A-44D7-ADA1-815102900862".toUpperCase();
            // Quality Assurance (canonical QA role — not the duplicate "QA" row)
            const QA_ROLE_ID = "8DA96376-659A-40B2-A3D4-34165984E90F".toUpperCase();

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

            const rawTeams = Array.isArray(teamsRes) ? teamsRes : [];
            const userMap: Record<string, string> = {};
            (usersRes.data || []).forEach((u: any) => {
                const id = String(u.userId ?? u.UserId ?? u.Id ?? '');
                if (id) userMap[id] = u.fullName ?? u.FullName ?? 'User';
            });
            const enrichedTeams = await Promise.all(
                rawTeams.map(async (t: any) => {
                    const teamId = t.teamId ?? t.TeamId;
                    const creatorId = String(t.createdBy ?? t.CreatedBy ?? '');
                    let qaNames: string[] = [];
                    let employeeNames: string[] = [];
                    let removableCount = 0;
                    let qaPending = 0;
                    const projectId = t.projectId ?? t.ProjectId;
                    try {
                        const members = await teamService.getTeamMembers(teamId);
                        members.forEach((m: any) => {
                            const role = resolveRole(m, creatorId);
                            const name = m.fullName ?? m.FullName ?? 'Member';
                            if (role === 'QA') qaNames.push(name);
                            else if (role === 'Employee') employeeNames.push(name);
                            if (role !== 'Manager') removableCount += 1;
                        });
                        if (projectId) {
                            const projTasks = await taskService.getByProject(String(projectId)).catch(() => []);
                            qaPending = (projTasks || []).filter((task: any) => {
                                const st = String(task.status ?? task.Status ?? '').toLowerCase();
                                return st === 'done' || st === 'submitted';
                            }).length;
                        }
                    } catch {
                        removableCount = Math.max(0, (t.memberCount ?? t.MemberCount ?? 0) - 1);
                    }
                    return {
                        TeamId: teamId,
                        Name: t.name ?? t.Name,
                        ProjectTitle: t.projectTitle ?? t.ProjectTitle,
                        ProjectId: t.projectId ?? t.ProjectId,
                        CreatedBy: t.createdBy ?? t.CreatedBy,
                        CreatedByName: t.createdByName ?? t.CreatedByName ?? userMap[creatorId] ?? 'Manager',
                        MemberCount: t.memberCount ?? t.MemberCount ?? 0,
                        qaNames,
                        employeeNames,
                        removableCount,
                        qaPendingReview: qaPending,
                    };
                })
            );
            setTeams(enrichedTeams);
            setEmployees(assignableUsers);
            setAllUsers(usersRes.data || []);
            const projArr = Array.isArray(projectsData) ? projectsData : [];
            setProjects(
                projArr.map((p: any) => ({
                    ProjectId: p.projectId ?? p.ProjectId,
                    Title: p.title ?? p.Title,
                }))
            );
        } catch (error) { 
            console.error("Error loading team data:", error); 
        }
    };

    const handleTeamClick = async (team: Team) => {
        setIsPanelOpen(true);
        setLoadingDetails(true);
        setHierarchy([]);
        setTeamMembers([]);
        setQaPendingReviewCount(0);
        
        try {
            const teamResponse = await api.get(`/teams/${team.TeamId}`);
            const raw = teamResponse.data;
            const freshTeamData = {
                TeamId: raw.teamId ?? raw.TeamId ?? team.TeamId,
                Name: raw.name ?? raw.Name ?? team.Name,
                ProjectTitle: raw.projectTitle ?? raw.ProjectTitle ?? team.ProjectTitle,
                ProjectId: raw.projectId ?? raw.ProjectId,
            };
            const creatorId = raw.createdBy ?? raw.CreatedBy ?? team.CreatedBy;
            const creatorName = raw.createdByName ?? raw.CreatedByName ?? team.CreatedByName ?? getUserName(String(creatorId));
            setActiveTeamCreator(creatorName);
            setActiveTeamCreatorId(String(creatorId ?? ''));
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
                const counts: Record<string, number> = {};
                let qaPending = 0;
                fullHierarchy.forEach((m: any) => {
                    (m.tasks || []).forEach((t: any) => {
                        const id = String(t.assignedEmployeeId ?? t.AssignedEmployeeId ?? '');
                        const st = String(t.status ?? t.Status ?? '').toLowerCase();
                        if (st === 'done' || st === 'submitted') qaPending += 1;
                        if (id && (st === 'todo' || st === 'inprogress' || st === 'pending')) {
                            counts[id] = (counts[id] || 0) + 1;
                        }
                    });
                });
                setMemberActiveTasks(counts);
                setQaPendingReviewCount(qaPending);
            } else {
                setQaPendingReviewCount(0);
            }
        } catch (error) { 
            console.error("Error loading team details:", error); 
        } finally { 
            setLoadingDetails(false); 
        }
    };

    const handleDeleteTeam = async (e: React.MouseEvent, team: Team) => {
        e.stopPropagation();
        setDeleteTeamTarget(team);
    };

    const confirmDeleteTeam = async () => {
        if (!deleteTeamTarget) return;
        setDeleteBusy(true);
        try {
            await teamService.deleteTeam(deleteTeamTarget.TeamId);
            setDeleteTeamTarget(null);
            pushToast('Team deleted successfully', 'success');
            loadData();
        } catch (err) {
            pushToast(apiErr(err), 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    const apiErr = (err: unknown) => {
        const ax = err as { response?: { data?: { message?: string; detail?: string } } };
        return ax.response?.data?.message ?? ax.response?.data?.detail ?? 'Request failed.';
    };

    const handleCreateTeam = async () => {
        const name = teamName.trim();
        if (!name) {
            alert('Team name is required.');
            return;
        }
        const managerId = localStorage.getItem('userId');
        if (!managerId) {
            alert('You must be logged in to create a team.');
            return;
        }
        try {
            const teamRes = await teamService.createTeam({ name, createdBy: managerId });
            const teamId = teamRes.TeamId || teamRes.teamId || teamRes.id;
            if (teamId) {
                try {
                    await teamService.addEmployeeToTeam(teamId, managerId);
                } catch {
                    /* manager may already exist on team */
                }
            }
            setTeamName("");
            loadData();
        } catch (err) {
            alert(apiErr(err));
        }
    };

    const handleAddMember = async () => {
        if (!selectedTeamForMember || !selectedEmployee) return;
        try {
            await teamService.addEmployeeToTeam(selectedTeamForMember, selectedEmployee);
            setSelectedEmployee(""); 
            loadData();
            alert("Member added successfully");
        } catch (err) {
            alert(apiErr(err));
        }
    };

    const handleRemoveMember = (member: any) => {
        if (!activeTeam) return;
        const employeeId = String(member.userId ?? member.UserId ?? member.Id ?? member.id);
        if (activeTeamCreatorId && employeeId === String(activeTeamCreatorId)) {
            pushToast('The team manager cannot be removed.', 'error');
            return;
        }
        setRemoveMemberTarget({ ...member, employeeId });
    };

    const confirmRemoveMember = async () => {
        if (!activeTeam || !removeMemberTarget) return;
        setDeleteBusy(true);
        try {
            await teamService.removeEmployeeFromTeam(activeTeam.TeamId, removeMemberTarget.employeeId);
            const updatedMembers = await teamService.getTeamMembers(activeTeam.TeamId);
            setTeamMembers(updatedMembers || []);
            setRemoveMemberTarget(null);
            pushToast('Member removed from team', 'success');
            loadData();
        } catch (err) {
            pushToast(apiErr(err), 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    const handleAssignToProject = async (teamId: string, projectId: string) => {
        try {
            await teamService.assignTeamToProject(teamId, projectId);
            await loadData();
        } catch (err: unknown) {
            alert(apiErr(err));
        }
    };

    const getUserName = (userId: string) => {
        if (!userId) return 'Unassigned';
        const u = allUsers.find(
            (e: any) => String(e.userId ?? e.UserId ?? e.Id ?? e.id) === String(userId)
        );
        return u ? (u.fullName ?? u.FullName) : 'Unassigned';
    };

    const getEmployeeName = (empId: string) => getUserName(empId);

    const filteredTeams = teams.filter(t => 
        t.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ProjectTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const portalRole = localStorage.getItem('roleName') || localStorage.getItem('userRole');

    return (
        <div className="min-h-screen bg-bg pb-20">
            {/* Header */}
            <div className="bg-surface border-b border-line mb-8 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-fg flex items-center gap-3">
                            <FiUsers className="text-primary" /> Team Hub
                        </h1>
                        <p className="text-fg-muted mt-1 font-medium">Manage your workforce and project distribution</p>
                    </div>

                    <div className="relative group w-full md:w-96">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search teams or projects..."
                            className="w-full pl-12 pr-4 py-3 bg-surface-2 border border-transparent rounded-lg outline-none focus:bg-surface-3 focus:border-primary transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Create Team Card */}
                    <div className="bg-surface rounded-xl shadow-e1 border border-line p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-primary-soft text-primary rounded-lg flex items-center justify-center">
                                <FiPlus size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-fg">New Operational Team</h2>
                        </div>
                        <div className="flex gap-3">
                            <input
                                className="flex-1 bg-surface-2 border border-line p-4 rounded-lg outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all font-medium"
                                placeholder="Enter team name..."
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                            />
                            <button onClick={handleCreateTeam} className="bg-primary hover:bg-primary-hover text-primary-fg px-8 rounded-lg font-bold shadow-e2 transition-all active:scale-95">
                                Create
                            </button>
                        </div>
                    </div>

                    {/* Member Assignment Card */}
                    <div className="bg-surface rounded-xl shadow-e1 border border-line p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-info-soft text-info rounded-lg flex items-center justify-center">
                                <FiUserPlus size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-fg">Assign Member</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <select 
                                className="bg-surface-2 border border-line p-4 rounded-lg outline-none cursor-pointer font-medium"
                                value={selectedTeamForMember} 
                                onChange={(e) => setSelectedTeamForMember(e.target.value)}
                            >
                                <option value="">Select Team</option>
                                {teams.map((t: any) => <option key={t.TeamId} value={t.TeamId}>{t.Name}</option>)}
                            </select>
                            <select 
                                className="bg-surface-2 border border-line p-4 rounded-lg outline-none cursor-pointer font-medium"
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
                        <button onClick={handleAddMember} className="w-full mt-4 bg-primary text-primary-fg p-4 rounded-lg font-bold hover:bg-primary-hover transition-all active:scale-[0.98]">
                            Add to Team
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-fg">Operational Teams</h2>
                    <span className="bg-primary-soft text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                        {filteredTeams.length} Teams
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredTeams.map((team: any) => (
                        <div
                            key={team.TeamId}
                            onClick={() => handleTeamClick(team)}
                            className="group bg-surface rounded-xl p-8 shadow-e1 border border-line hover:shadow-e3 hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden"
                        >
                            <FiUsers className="absolute -bottom-4 -right-4 text-surface-2 size-32 group-hover:text-primary-soft transition-colors pointer-events-none" />

                            <div className="relative">
                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-2xl font-bold text-fg group-hover:text-primary transition-colors pr-8">
                                        {team.Name}
                                    </h3>
                                    <button
                                        onClick={(e) => handleDeleteTeam(e, team)}
                                        title={
                                            (team.removableCount ?? 0) > 0
                                                ? 'Remove employees/QA before deleting'
                                                : 'Delete team'
                                        }
                                        className="p-2 text-fg-subtle hover:text-danger hover:bg-danger-soft rounded-lg transition-all"
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>

                                <div className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest mb-4 space-y-1">
                                    <p>Manager <span className="text-primary">{team.CreatedByName ?? 'Manager'}</span></p>
                                    {team.qaNames?.length > 0 && (
                                        <p>
                                            QA <span className="text-violet-600">{team.qaNames.join(', ')}</span>
                                            {(team.qaPendingReview ?? 0) > 0 && (
                                                <span className="block text-warning normal-case tracking-normal font-bold text-[11px] mt-0.5">
                                                    {team.qaPendingReview} pending for review
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    {team.employeeNames?.length > 0 && (
                                        <p className="normal-case tracking-normal text-fg-muted font-bold text-xs">
                                            {team.employeeNames.join(' · ')}
                                        </p>
                                    )}
                                </div>
                                <div className="bg-primary-soft/50 rounded-lg p-4 mb-6">
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1 block">Assigned Project</span>
                                    <div className="flex items-center gap-2 text-primary font-bold">
                                        <FiBriefcase size={14} />
                                        <p className="truncate">{team.ProjectTitle || "Not Assigned"}</p>
                                    </div>
                                </div>

                                <div onClick={(e) => e.stopPropagation()}>
                                    <label className="text-[10px] font-bold text-fg-subtle uppercase block mb-2 px-1">Quick Reassign</label>
                                    <select
                                        onChange={(e) => handleAssignToProject(team.TeamId, e.target.value)}
                                        className="w-full bg-surface-2 border border-line p-3 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none cursor-pointer"
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

            {portalRole === 'Manager' && (
                <div className="mt-12">
                    <AiAllocation embedded variant="team-only" onTeamApplied={loadData} />
                </div>
            )}

            {/* Workflow Modal */}
            {isPanelOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsPanelOpen(false)} />

                    <div className="relative w-full max-w-3xl bg-surface max-h-[90vh] rounded-xl shadow-e3 flex flex-col overflow-hidden">
                        <div className="p-8 border-b border-line flex justify-between items-center bg-surface sticky top-0 z-10">
                            <div>
                                <p className="text-primary font-bold text-xs uppercase tracking-widest mb-1">Team Overview</p>
                                <h2 className="text-2xl font-bold text-fg">{activeTeam?.Name}</h2>
                                {activeTeam?.ProjectTitle && (
                                    <p className="text-sm text-fg-muted font-bold">Project: {activeTeam.ProjectTitle}</p>
                                )}
                                {activeTeamCreator && (
                                    <p className="text-sm text-primary font-bold mt-1">Manager / creator: {activeTeamCreator}</p>
                                )}
                            </div>
                            <button onClick={() => setIsPanelOpen(false)} className="p-3 bg-surface-2 rounded-lg text-fg-subtle hover:text-danger transition-colors">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 gap-4">
                                    <div className="w-12 h-12 border-4 border-line border-t-primary rounded-full animate-spin" />
                                    <p className="font-bold text-fg-subtle">Syncing with database...</p>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <FiUsers className="text-primary" />
                                            <h3 className="font-bold text-fg uppercase text-xs tracking-widest">Team roster</h3>
                                        </div>
                                        {activeTeamCreator && (
                                            <div className="mb-4 p-4 rounded-lg bg-primary-soft border border-primary-border">
                                                <p className="text-[9px] font-bold uppercase text-primary tracking-widest mb-1">Manager</p>
                                                <p className="font-bold text-primary">{activeTeamCreator}</p>
                                            </div>
                                        )}
                                        {(() => {
                                            const creatorId = activeTeamCreatorId;
                                            const qaList = teamMembers.filter((m) => isQaMember(m, creatorId));
                                            const empList = teamMembers.filter(
                                                (m) => !isManagerMember(m, creatorId) && !isQaMember(m, creatorId)
                                            );
                                            const renderEmployeeChip = (member: any) => {
                                                const mid = String(member.userId ?? member.UserId ?? member.Id ?? member.id);
                                                const active = memberActiveTasks[mid] ?? 0;
                                                const isFree = active === 0;
                                                return (
                                                    <div
                                                        key={mid}
                                                        className={`flex items-center gap-3 pl-4 pr-2 py-2 rounded-lg border ${
                                                            isFree ? 'bg-success-soft border-success/25 ring-1 ring-success/25' : 'bg-surface-2 border-line'
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-primary-fg font-bold ${isFree ? 'bg-success' : 'bg-primary'}`}>
                                                            {(member.fullName ?? member.FullName)?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-bold text-fg-muted block">{member.fullName ?? member.FullName}</span>
                                                            <span className={`text-[9px] font-bold uppercase ${isFree ? 'text-success' : 'text-fg-subtle'}`}>
                                                                {isFree ? 'FREE — no active tasks' : `${active} active task(s)`}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveMember(member)}
                                                            className="p-1.5 text-fg-subtle hover:text-danger hover:bg-danger-soft rounded-lg transition-all"
                                                        >
                                                            <FiX size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            };

                                            const renderQaChip = (member: any) => {
                                                const mid = String(member.userId ?? member.UserId ?? member.Id ?? member.id);
                                                const pending = qaPendingReviewCount;
                                                const hasPending = pending > 0;
                                                return (
                                                    <div
                                                        key={mid}
                                                        className={`flex items-center gap-3 pl-4 pr-2 py-2 rounded-lg border ${
                                                            hasPending ? 'bg-warning-soft border-warning/25 ring-1 ring-warning/25' : 'bg-violet-50 border-violet-100'
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-primary-fg font-bold ${hasPending ? 'bg-warning' : 'bg-violet-600'}`}>
                                                            {(member.fullName ?? member.FullName)?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-bold text-fg-muted block">{member.fullName ?? member.FullName}</span>
                                                            <span className={`text-[9px] font-bold uppercase ${hasPending ? 'text-warning' : 'text-violet-600'}`}>
                                                                {hasPending
                                                                    ? `${pending} pending for review`
                                                                    : 'No tasks awaiting review'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveMember(member)}
                                                            className="p-1.5 text-fg-subtle hover:text-danger hover:bg-danger-soft rounded-lg transition-all"
                                                        >
                                                            <FiX size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            };
                                            if (teamMembers.length === 0) {
                                                return <p className="text-xs text-fg-subtle font-medium px-2">No members assigned.</p>;
                                            }
                                            return (
                                                <div className="space-y-4">
                                                    {qaList.length > 0 && (
                                                        <div>
                                                            <p className="text-[9px] font-bold uppercase text-violet-500 tracking-widest mb-2">Quality assurance</p>
                                                            <div className="flex flex-wrap gap-3">{qaList.map((m) => renderQaChip(m))}</div>
                                                        </div>
                                                    )}
                                                    {empList.length > 0 && (
                                                        <div>
                                                            <p className="text-[9px] font-bold uppercase text-fg-subtle tracking-widest mb-2">Employees</p>
                                                            <div className="flex flex-wrap gap-3">{empList.map((m) => renderEmployeeChip(m))}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </section>

                                    <hr className="border-line" />

                                    <section>
                                        <div className="flex items-center gap-2 mb-6">
                                            <FiBriefcase className="text-primary" />
                                            <h3 className="font-bold text-fg uppercase text-xs tracking-widest">Project Roadmap</h3>
                                        </div>

                                        {hierarchy.length === 0 ? (
                                            <div className="text-center py-20 bg-surface-2 rounded-xl border-2 border-dashed border-line">
                                                <FiInfo className="mx-auto text-fg-subtle mb-4" size={40} />
                                                <p className="text-fg-subtle font-bold">No roadmap found.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-8">
                                                {hierarchy.map((milestone) => (
                                                    <div key={milestone.MilestoneId || milestone.milestoneId} className="border border-line rounded-lg p-5 bg-surface-2/50">
                                                        <div className="flex items-start justify-between gap-4 mb-3">
                                                            <h4 className="font-bold text-fg text-base leading-tight">{milestone.Title || milestone.title}</h4>
                                                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase shrink-0 ${
                                                                milestone.Status === 'Completed' ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary'
                                                            }`}>
                                                                {milestone.Status}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                                            {(milestone.tasks?.length ?? 0) === 0 ? (
                                                                <p className="text-xs text-fg-subtle">No tasks in this milestone.</p>
                                                            ) : (
                                                                milestone.tasks?.map((task: any) => (
                                                                    <div key={task.TaskId || task.taskId} className="bg-surface border border-line p-4 rounded-lg flex justify-between items-center gap-2">
                                                                        <div className="min-w-0">
                                                                            <p className="font-bold text-fg text-sm truncate">{task.Title || task.title}</p>
                                                                            <p className="text-[11px] text-fg-muted mt-1">
                                                                                Assigned: <strong>{getEmployeeName(task.AssignedEmployeeId || task.assignedEmployeeId)}</strong>
                                                                            </p>
                                                                        </div>
                                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-warning-soft text-warning shrink-0">
                                                                            {task.Status || task.status || 'Todo'}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            )}
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

            <ConfirmDeleteModal
                open={Boolean(deleteTeamTarget)}
                message={
                    deleteTeamTarget
                        ? `Delete team "${deleteTeamTarget.Name}"? You won't be able to revert this!`
                        : undefined
                }
                details={
                    deleteTeamTarget
                        ? [
                              { label: 'Team', value: deleteTeamTarget.Name },
                              { label: 'Project', value: deleteTeamTarget.ProjectTitle || 'Not assigned' },
                              { label: 'Manager', value: deleteTeamTarget.CreatedByName || '—' },
                              {
                                  label: 'Removable members',
                                  value: String(deleteTeamTarget.removableCount ?? 0),
                              },
                          ]
                        : []
                }
                warning={
                    (deleteTeamTarget?.removableCount ?? 0) > 0
                        ? 'Remove all employees and QA first. The manager stays until the team can be deleted.'
                        : deleteTeamTarget?.ProjectId
                          ? 'The linked project will become available for a new team assignment.'
                          : 'This action cannot be undone.'
                }
                busy={deleteBusy}
                onConfirm={confirmDeleteTeam}
                onCancel={() => !deleteBusy && setDeleteTeamTarget(null)}
            />

            <ConfirmDeleteModal
                open={Boolean(removeMemberTarget)}
                message={
                    removeMemberTarget
                        ? `Remove ${removeMemberTarget.fullName ?? removeMemberTarget.FullName} from the team? You won't be able to revert this!`
                        : undefined
                }
                details={
                    removeMemberTarget
                        ? [
                              {
                                  label: 'Member',
                                  value:
                                      removeMemberTarget.fullName ??
                                      removeMemberTarget.FullName ??
                                      '—',
                              },
                              {
                                  label: 'Role',
                                  value: resolveRole(removeMemberTarget, activeTeamCreatorId),
                              },
                              {
                                  label: 'Active tasks',
                                  value: String(
                                      memberActiveTasks[removeMemberTarget.employeeId] ?? 0
                                  ),
                              },
                              { label: 'Team', value: activeTeam?.Name ?? '—' },
                          ]
                        : []
                }
                warning={
                    (memberActiveTasks[removeMemberTarget?.employeeId] ?? 0) > 0
                        ? 'This member still has active tasks on the project. Unassign or complete tasks before removing.'
                        : undefined
                }
                confirmLabel="Remove"
                busy={deleteBusy}
                onConfirm={confirmRemoveMember}
                onCancel={() => !deleteBusy && setRemoveMemberTarget(null)}
            />

            <ToastStack toasts={toasts} />
        </div>
    );
};

export default Teams;