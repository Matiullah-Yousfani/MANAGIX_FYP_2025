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

    // Shared link styling — dense rows with a primary active state.
    const linkBase =
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 border-l-2';
    const linkClass = (isOn: boolean) =>
        isOn
            ? 'bg-primary-soft text-fg font-semibold border-primary'
            : 'text-fg-muted hover:bg-surface-2 hover:text-fg border-transparent';
    const isActive = (path: string) => linkClass(location.pathname === path);

    // Small section heading above each group of links.
    const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = 'text-fg-subtle' }) => (
        <div className={`px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${className}`}>{children}</div>
    );

    const iconCls = 'size-[18px] shrink-0';

    return (
        <div className="w-64 h-screen bg-surface text-fg flex flex-col fixed border-r border-line z-40">
            {/* --- LOGO SECTION --- */}
            <div className="px-5 py-5 shrink-0 border-b border-line">
                <h2 className="text-lg font-bold tracking-tight flex items-center gap-2.5">
                    <span className="size-8 bg-primary text-primary-fg flex items-center justify-center rounded-lg font-bold text-base">M</span>
                    MANAGIX
                </h2>
                <div className="mt-1.5 ml-0.5 text-[10px] font-medium text-fg-subtle uppercase tracking-[0.2em]">Workspace v2.0</div>
            </div>

            <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto no-scrollbar">
                {/* --- UNIVERSAL LINKS --- */}
                <SectionLabel>General</SectionLabel>

                <Link to="/dashboard" className={`${linkBase} ${isActive('/dashboard')}`}>
                    <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    <span>Dashboard</span>
                </Link>

                {appRole !== 'Admin' && (
                    <Link to="/profile" className={`${linkBase} ${isActive('/profile')}`}>
                        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <span>My Profile</span>
                    </Link>
                )}

                {!isQaRole(role) && appRole !== 'Admin' && (
                    <Link to="/task-hub" className={`${linkBase} ${isActive('/task-hub')}`}>
                        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <span>Tasks</span>
                    </Link>
                )}

                {/* MEETING ROOM: only enabled during an active scheduled meeting window */}
                {appRole !== 'Admin' && (
                    hasActive ? (
                        <Link to={meetingRoomTo} className={`${linkBase} ${linkClass(location.pathname === '/meeting')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            <span>Meeting Room</span>
                            <span className="ml-auto size-2 rounded-full bg-success animate-pulse" title="Live" />
                        </Link>
                    ) : (
                        <div
                            className={`${linkBase} border-transparent text-fg-subtle opacity-50 cursor-not-allowed`}
                            title="No active meeting right now"
                        >
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            <span>Meeting Room</span>
                        </div>
                    )
                )}

                {appRole !== 'Admin' && (
                    <Link to="/meeting/transcripts" className={`${linkBase} ${isActive('/meeting/transcripts')}`}>
                        <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span>Meeting Transcripts</span>
                    </Link>
                )}

                {/* --- ROLE BASED LINKS --- */}

                {appRole === 'Admin' && (
                    <>
                        <SectionLabel className="text-primary">Admin Control</SectionLabel>
                        <Link to="/admin?tab=overview" className={`${linkBase} ${linkClass(location.pathname.startsWith('/admin'))}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            <span>Admin Portal</span>
                        </Link>
                    </>
                )}

                {appRole === 'Manager' && (
                    <>
                        <SectionLabel className="text-success">Project Management</SectionLabel>
                        <Link to="/create-project" className="flex items-center justify-center gap-2 mx-0 my-1.5 px-3 py-2.5 bg-primary text-primary-fg text-xs font-semibold rounded-lg hover:bg-primary-hover transition-all active:scale-[0.98] shadow-e1">
                            <span className="text-base leading-none">+</span> NEW PROJECT
                        </Link>
                        <Link to="/projects" className={`${linkBase} ${isActive('/projects')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" /></svg>
                            <span>My Projects</span>
                        </Link>
                        <Link to="/teams" className={`${linkBase} ${isActive('/teams')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span>Team Setup</span>
                        </Link>
                        <Link to="/milestones" className={`${linkBase} ${isActive('/milestones')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <span>Milestones</span>
                        </Link>
                        <Link to="/meeting/schedule" className={`${linkBase} ${isActive('/meeting/schedule')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span>Schedule Meeting</span>
                        </Link>
                        <Link to="/meeting/summaries" className={`${linkBase} ${isActive('/meeting/summaries')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            <span>Meeting Summaries</span>
                        </Link>
                        <Link to="/workload" className={`${linkBase} ${isActive('/workload')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            <span>Workload</span>
                        </Link>
                        <Link to="/payroll" className={`${linkBase} ${isActive('/payroll')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>Compensation</span>
                        </Link>
                        <Link to="/insights" className={`${linkBase} ${isActive('/insights')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            <span>Team insights</span>
                        </Link>
                        <Link to="/timesheets" className={`${linkBase} ${isActive('/timesheets')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>Timesheets</span>
                        </Link>
                    </>
                )}

                {appRole === 'Employee' && (
                    <>
                        <SectionLabel className="text-info">Employee Portal</SectionLabel>
                        <Link to="/projects" className={`${linkBase} ${isActive('/projects')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            <span>My Assignments</span>
                        </Link>
                        <Link to="/insights" className={`${linkBase} ${isActive('/insights')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            <span>My Insights</span>
                        </Link>
                    </>
                )}

                {isQaRole(role) && (
                    <>
                        <SectionLabel className="text-warning">Quality Assurance</SectionLabel>
                        <Link to="/qa/review" className={`${linkBase} ${isActive('/qa/review')}`}>
                            <svg className={iconCls} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            <span>Review Tasks</span>
                        </Link>
                    </>
                )}
            </nav>

            {/* --- FOOTER / LOGOUT --- */}
            <div className="p-3 border-t border-line">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 bg-danger-soft text-danger border border-danger/25 px-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wide hover:bg-danger hover:text-white transition-all active:scale-[0.98]"
                >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
