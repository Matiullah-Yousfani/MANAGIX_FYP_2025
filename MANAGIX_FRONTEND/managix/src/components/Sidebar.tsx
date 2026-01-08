import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const activeProjectId = localStorage.getItem('lastViewedProjectId');
    const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const isActive = (path: string) =>
        location.pathname === path ? "bg-white text-black font-bold" : "hover:bg-gray-800 text-gray-300";

    return (
        <div className="w-64 h-screen bg-black text-white flex flex-col p-6 fixed shadow-2xl">
            <h2 className="text-3xl font-black mb-10 tracking-tighter italic shrink-0">MANAGIX</h2>

            <nav className="flex-1 space-y-2 overflow-y-auto no-scrollbar pr-1">
                {/* --- UNIVERSAL LINKS --- */}
                <Link to="/dashboard" className={`block p-3 rounded-xl transition ${isActive('/dashboard')}`}>
                    Dashboard
                </Link>

                <Link to="/profile" className={`block p-3 rounded-xl transition ${isActive('/profile')}`}>
                    My Profile
                </Link>

                {/* ✅ THE NEW TASK HUB (Visible to all roles) */}
                <Link to="/task-hub" className={`block p-3 rounded-xl transition ${isActive('/task-hub')}`}>
                    Tasks
                </Link>

                <hr className="border-gray-800 my-4 mx-2" />

                {/* --- ROLE BASED LINKS --- */}

                {role === 'Admin' && (
                    <>
                        <div className="pt-2 pb-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Admin Control</div>
                        <Link to="/admin/approvals" className={`block p-3 rounded-xl transition ${isActive('/admin/approvals')}`}>Actions</Link>
                    </>
                )}

                {role === 'Manager' && (
                    <>
                        <div className="pt-2 pb-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Project Management</div>
                        <Link to="/create-project" className="block p-3 bg-white text-black text-center font-black rounded-xl mb-4 hover:scale-105 transition transform sticky top-0 z-10 shadow-lg">
                            + New Project
                        </Link>
                        <Link to="/projects" className={`block p-3 rounded-xl transition ${isActive('/projects')}`}>My Projects</Link>
                        <Link to="/teams" className={`block p-3 rounded-xl transition ${isActive('/teams')}`}>Team Setup</Link>
                        <Link to="/milestones" className={`block p-3 rounded-xl transition ${isActive('/milestones')}`}>Milestones</Link>
                        
                        <Link
                            to={activeProjectId ? `/performance/${activeProjectId}` : '/projects'}
                            className={`block p-3 rounded-xl transition ${isActive(`/performance/${activeProjectId}`) || isActive('/performance')}`}
                        >
                            <div className="flex items-center justify-between">
                                <span>Performance</span>
                                {!activeProjectId && <span className="text-[8px] bg-yellow-500 text-black px-1 rounded">Select Project</span>}
                            </div>
                        </Link>
                    </>
                )}

                {role === 'Employee' && (
                    <>
                        <div className="pt-2 pb-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Employee Portal</div>
                        <Link to="/projects" className={`block p-3 rounded-xl transition ${isActive('/projects')}`}>My Assignments</Link>
                    </>
                )}

                {role === 'QA' && (
                    <>
                        <div className="pt-2 pb-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Quality Assurance</div>
                        <Link to="/qa/review" className={`block p-3 rounded-xl transition ${isActive('/qa/review')}`}>Review Tasks</Link>
                    </>
                )}
            </nav>

            <button
                onClick={handleLogout}
                className="mt-6 shrink-0 flex items-center justify-center gap-2 bg-red-600/10 text-red-500 border border-red-500/20 p-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition"
            >
                Logout
            </button>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default Sidebar;