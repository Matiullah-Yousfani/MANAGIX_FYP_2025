import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Fetch role from localStorage
    const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const isActive = (path: string) =>
        location.pathname === path 
            ? "bg-white/10 text-white border-l-4 border-white font-bold" 
            : "hover:bg-white/5 text-gray-400 hover:text-gray-100 border-l-4 border-transparent";

    return (
        <div className="w-64 h-screen bg-[#0A0A0A] text-white flex flex-col p-0 fixed shadow-2xl border-r border-white/5">
            {/* --- LOGO SECTION --- */}
            <div className="p-8 shrink-0">
                <h2 className="text-2xl font-black tracking-tighter italic flex items-center gap-2">
                    <div className="size-8 bg-white text-black flex items-center justify-center rounded-lg not-italic">M</div>
                    MANAGIX
                </h2>
                <div className="mt-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Workspace v2.0</div>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
                {/* --- UNIVERSAL LINKS --- */}
                <div className="pb-2 px-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">General</div>
                
                <Link to="/dashboard" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/dashboard')}`}>
                    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    <span className="text-sm tracking-tight">Dashboard</span>
                </Link>

                {role !== 'Admin' && (
                    <Link to="/profile" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/profile')}`}>
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        <span className="text-sm tracking-tight">My Profile</span>
                    </Link>
                )}

                {role !== 'QA' && (
                    <Link to="/task-hub" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/task-hub')}`}>
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                        <span className="text-sm tracking-tight">Tasks</span>
                    </Link>
                )}

                {/* MEETING ROOM: Hidden for Admin only */}
                {role !== 'Admin' && (
                    <Link to="/meeting" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/meeting')}`}>
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        <span className="text-sm tracking-tight">Meeting Room</span>
                    </Link>
                )}

                <div className="py-4">
                    <hr className="border-white/5 mx-4" />
                </div>

                {/* --- ROLE BASED LINKS --- */}

                {role === 'Admin' && (
                    <>
                        <div className="pb-2 px-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest">Admin Control</div>
                        <Link to="/admin/approvals" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/admin/approvals')}`}>
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            <span className="text-sm tracking-tight">Actions</span>
                        </Link>
                    </>
                )}

                {role === 'Manager' && (
                    <>
                        <div className="pb-2 px-4 text-[10px] font-black text-emerald-500 uppercase tracking-widest">Project Management</div>
                        <Link to="/create-project" className="mx-4 flex items-center justify-center gap-2 p-3 bg-white text-black text-xs font-black rounded-xl mb-4 hover:bg-emerald-400 transition-all transform active:scale-95 shadow-xl shadow-white/5">
                            <span className="text-lg">+</span> NEW PROJECT
                        </Link>
                        <Link to="/projects" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/projects')}`}>
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" /></svg>
                            <span className="text-sm tracking-tight">My Projects</span>
                        </Link>
                        <Link to="/teams" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/teams')}`}>
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <span className="text-sm tracking-tight">Team Setup</span>
                        </Link>
                        <Link to="/milestones" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/milestones')}`}>
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <span className="text-sm tracking-tight">Milestones</span>
                        </Link>
                    </>
                )}

                {role === 'Employee' && (
                    <>
                        <div className="pb-2 px-4 text-[10px] font-black text-blue-500 uppercase tracking-widest">Employee Portal</div>
                        <Link to="/projects" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/projects')}`}>
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            <span className="text-sm tracking-tight">My Assignments</span>
                        </Link>
                    </>
                )}

                {role === 'QA' && (
                    <>
                        <div className="pb-2 px-4 text-[10px] font-black text-orange-500 uppercase tracking-widest">Quality Assurance</div>
                        <Link to="/qa/review" className={`flex items-center gap-3 p-3 rounded-r-xl transition-all duration-300 ${isActive('/qa/review')}`}>
                            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            <span className="text-sm tracking-tight">Review Tasks</span>
                        </Link>
                    </>
                )}
            </nav>

            {/* --- FOOTER / LOGOUT --- */}
            <div className="p-6 border-t border-white/5">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95"
                >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout
                </button>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default Sidebar;