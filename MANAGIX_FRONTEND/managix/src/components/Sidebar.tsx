import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { isQaRole, normalizeAppRole } from '../utils/roles';
import { useActiveMeetings } from '../hooks/useActiveMeetings';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { active, hasActive } = useActiveMeetings();

    const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');
    const appRole = normalizeAppRole(role);
    const userName = localStorage.getItem('userName') || 'User';
    const userEmail = localStorage.getItem('userEmail') || '';
    const initials = userName
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U';

    const activeMeetingId = active.length === 1
        ? (active[0].meetingId ?? (active[0] as any).MeetingId)
        : null;
    const meetingRoomTo = activeMeetingId
        ? `/meeting?meetingId=${activeMeetingId}`
        : active.length > 1
            ? '/meeting'
            : '/meeting';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    // Shared link styling — a soft gradient "pill" for the active route,
    // a subtle hover wash otherwise. Replaces the old left-border bar.
    const linkBase =
        'group flex items-center gap-3 p-3 rounded-xl transition-all duration-300';
    const activeCls =
        'bg-gradient-to-r from-white/[0.14] to-white/[0.03] text-white font-semibold ring-1 ring-white/10 shadow-lg shadow-black/30';
    const idleCls =
        'text-gray-400 hover:text-white hover:bg-white/[0.06]';

    const isActive = (path: string) =>
        location.pathname === path ? activeCls : idleCls;

    return (
        <div className="w-64 h-screen bg-gradient-to-b from-[#111114] to-[#08080A] text-white flex flex-col p-0 fixed shadow-2xl border-r border-white/[0.06] overflow-hidden">
            {/* Soft ambient glow behind the logo for depth */}
            <div className="pointer-events-none absolute -top-24 -left-10 size-56 rounded-full bg-indigo-600/20 blur-3xl" />

            {/* --- LOGO SECTION --- */}
            <div className="relative p-8 shrink-0">
                <h2 className="text-2xl font-extrabold tracking-tighter italic flex items-center gap-2">
                    <div className="size-9 bg-white text-black flex items-center justify-center rounded-xl not-italic shadow-lg shadow-white/10">M</div>
                    MANAGIX
                </h2>
                <div className="mt-2 text-[10px] font-extrabold text-gray-500 uppercase tracking-[0.3em]">Workspace v2.0</div>
            </div>

            <nav className="relative flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
                {/* --- UNIVERSAL LINKS --- */}
                <div className="pb-2 px-3 text-[10px] font-extrabold text-gray-600 uppercase tracking-widest">General</div>

                <Link to="/dashboard" className={`${linkBase} ${isActive('/dashboard')}`}>
                    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    <span className="text-sm tracking-tight">Dashboard</span>
                </Link>

                {appRole !== 'Admin' && (
                    <Link to="/profile" className={`${linkBase} ${isActive('/profile')}`}>
                        <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <span className="text-sm tracking-tight">My Profile</span>
                    </Link>
                )}

                {!isQaRole(role) && appRole !== 'Admin' && (
                    <Link to="/task-hub" className={`${linkBase} ${isActive('/task-hub')}`}>
                        <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <span className="text-sm tracking-tight">Tasks</span>
                    </Link>
                )}

                {/* MEETING ROOM: only enabled during an active scheduled meeting window */}
                {appRole !== 'Admin' && (
                    hasActive ? (
                        <Link to={meetingRoomTo} className={`${linkBase} ${location.pathname === '/meeting' ? activeCls : idleCls}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            <span className="text-sm tracking-tight">Meeting Room</span>
                            <span className="ml-auto size-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" title="Live" />
                        </Link>
                    ) : (
                        <div
                            className="flex items-center gap-3 p-3 rounded-xl text-gray-600 opacity-50 cursor-not-allowed"
                            title="No active meeting right now"
                        >
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            <span className="text-sm tracking-tight">Meeting Room</span>
                        </div>
                    )
                )}

                {appRole !== 'Admin' && (
                    <Link to="/meeting/transcripts" className={`${linkBase} ${isActive('/meeting/transcripts')}`}>
                        <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-sm tracking-tight">Meeting Transcripts</span>
                    </Link>
                )}

                <div className="py-4">
                    <hr className="border-white/[0.06] mx-3" />
                </div>

                {/* --- ROLE BASED LINKS --- */}

                {appRole === 'Admin' && (
                    <>
                        <div className="pb-2 px-3 text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">Admin Control</div>
                        <Link to="/admin?tab=overview" className={`${linkBase} ${location.pathname.startsWith('/admin') ? activeCls : idleCls}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            <span className="text-sm tracking-tight">Admin Portal</span>
                        </Link>
                    </>
                )}

                {appRole === 'Manager' && (
                    <>
                        <div className="pb-2 px-3 text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">Project Management</div>
                        <Link to="/create-project" className="mx-1 flex items-center justify-center gap-2 p-3 bg-white text-black text-xs font-extrabold rounded-xl mb-4 hover:bg-emerald-400 transition-all transform active:scale-95 shadow-xl shadow-white/5">
                            <span className="text-lg">+</span> NEW PROJECT
                        </Link>
                        <Link to="/projects" className={`${linkBase} ${isActive('/projects')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" /></svg>
                            <span className="text-sm tracking-tight">My Projects</span>
                        </Link>
                        <Link to="/teams" className={`${linkBase} ${isActive('/teams')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className="text-sm tracking-tight">Team Setup</span>
                        </Link>
                        <Link to="/milestones" className={`${linkBase} ${isActive('/milestones')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <span className="text-sm tracking-tight">Milestones</span>
                        </Link>
                        <Link to="/meeting/schedule" className={`${linkBase} ${isActive('/meeting/schedule')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="text-sm tracking-tight">Schedule Meeting</span>
                        </Link>
                        <Link to="/meeting/summaries" className={`${linkBase} ${isActive('/meeting/summaries')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            <span className="text-sm tracking-tight">Meeting Summaries</span>
                        </Link>
                        {/* PHASE 3: Manager workload panel — capacity overview for the team. */}
                        <Link to="/workload" className={`${linkBase} ${isActive('/workload')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            <span className="text-sm tracking-tight">Workload</span>
                        </Link>
                        <Link to="/payroll" className={`${linkBase} ${isActive('/payroll')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-sm tracking-tight">Compensation</span>
                        </Link>
                        <Link to="/insights" className={`${linkBase} ${isActive('/insights')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            <span className="text-sm tracking-tight">Team insights</span>
                        </Link>
                        <Link to="/timesheets" className={`${linkBase} ${isActive('/timesheets')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-sm tracking-tight">Timesheets</span>
                        </Link>
                    </>
                )}

                {appRole === 'Employee' && (
                    <>
                        <div className="pb-2 px-3 text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">Employee Portal</div>
                        <Link to="/projects" className={`${linkBase} ${isActive('/projects')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            <span className="text-sm tracking-tight">My Assignments</span>
                        </Link>
                        <Link to="/my-timesheet" className={`${linkBase} ${isActive('/my-timesheet')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-sm tracking-tight">My Timesheet</span>
                        </Link>
                        <Link to="/insights" className={`${linkBase} ${isActive('/insights')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            <span className="text-sm tracking-tight">My Insights</span>
                        </Link>
                    </>
                )}

                {isQaRole(role) && (
                    <>
                        <div className="pb-2 px-3 text-[10px] font-extrabold text-orange-400 uppercase tracking-widest">Quality Assurance</div>
                        <Link to="/qa/review" className={`${linkBase} ${isActive('/qa/review')}`}>
                            <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            <span className="text-sm tracking-tight">Review Tasks</span>
                        </Link>
                    </>
                )}
            </nav>

            {/* --- USER PROFILE + LOGOUT --- */}
            <div className="relative p-4 border-t border-white/[0.06] space-y-3">
                <div className="flex items-center gap-3 px-2 py-1">
                    <div className="grid place-items-center size-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-extrabold shadow-lg shadow-indigo-600/30">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{userName}</div>
                        <div className="text-[11px] text-gray-500 truncate">
                            {userEmail || appRole}
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl text-xs font-extrabold uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95"
                >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
