import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminService } from '../../api/adminService';
import api from '../../api/axiosInstance';
import { motion, AnimatePresence } from 'framer-motion';
import AdminProjectsTab from '../../components/admin/AdminProjectsTab';
import AdminHourlyRatesTab from '../../components/admin/AdminHourlyRatesTab';
import AdminAllTimesheetsTab from '../../components/admin/AdminAllTimesheetsTab';
import MonitoringPanel from '../admin/MonitoringPanel';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const ADMIN_TABS = ['overview', 'users', 'all-users', 'projects', 'monitoring', 'payroll', 'all-timesheets'] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

interface UserRequest {
  RequestId: string;
  FullName: string;
  Email: string;
  RoleId: string;
  Status: string;
  CreatedAt: string;
}

interface Role {
  RoleId: string;
  RoleName: string;
}

const AdminPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

  useEffect(() => {
    if (role && role !== 'Admin') navigate('/dashboard', { replace: true });
  }, [role, navigate]);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [allApprovedUsers, setAllApprovedUsers] = useState<any[]>([]);
  const [users, setUsers] = useState<UserRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Custom Notification State
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ userId: string; displayName: string; email?: string; role?: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const triggerNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const roleRes = await api.get('/roles');
      const systemRoles = (roleRes.data || []).map((r: any) => ({
        RoleId: r.roleId ?? r.RoleId,
        RoleName: r.roleName ?? r.RoleName,
      }));
      setRoles(systemRoles);

      const pendingList = await adminService.getPendingUsers();
      const sanitizedPending = Array.isArray(pendingList) ? pendingList.map((u: any) => {
        const rid = u.roleId ?? u.RoleId;
        const isInvalid = rid === "00000000-0000-0000-0000-000000000000" || !rid;
        const defaultRole = systemRoles.find((r) => r.RoleName === 'Employee') || systemRoles[0];
        return {
          ...u,
          RequestId: u.requestId ?? u.RequestId ?? u.userId ?? u.UserId,
          FullName: u.fullName ?? u.FullName,
          Email: u.email ?? u.Email,
          RoleId: isInvalid ? (defaultRole?.RoleId || "") : rid,
        };
      }) : [];
      setUsers(sanitizedPending);

      const fullUserList = await adminService.getAllUsers();
      const approvedOnly = Array.isArray(fullUserList) ? fullUserList.map((u: any) => ({
        ...u,
        UserId: u.userId ?? u.UserId,
        FullName: u.fullName ?? u.FullName,
        Email: u.email ?? u.Email,
        RoleId: u.roleId ?? u.RoleId ?? (u.userRoles?.[0]?.roleId ?? u.userRoles?.[0]?.RoleId ?? u.UserRoles?.[0]?.RoleId),
      })) : [];
      setAllApprovedUsers(approvedOnly);
    } catch (err) {
      triggerNotify("Failed to sync database", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const setTab = (tab: AdminTab) => {
    setActiveTab(tab);
    navigate(`/admin?tab=${tab}`, { replace: true });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rawTab = params.get('tab');
    const tab = (rawTab === 'hourly-rates' ? 'payroll' : rawTab) as AdminTab | null;
    if (tab && ADMIN_TABS.includes(tab)) {
      setActiveTab(tab);
      return;
    }
    if (location.pathname === '/admin/roles') setActiveTab('all-users');
    else if (location.pathname === '/admin/approvals') setActiveTab('users');
    else if (location.pathname === '/admin/monitoring') setActiveTab('monitoring');
  }, [location]);

  const handleApprove = async (id: string, roleId: string) => {
    try {
      await adminService.approveUser(id, roleId);
      triggerNotify("Authorization Granted Successfully");
      fetchData();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; detail?: string } } };
      const msg =
        ax.response?.data?.message ??
        ax.response?.data?.detail ??
        "Authorization failed";
      triggerNotify(msg, "error");
    }
  };

  const handleDeleteUser = (userId: string, displayName: string, email?: string, role?: string) => {
    const selfId = localStorage.getItem('userId');
    if (selfId && selfId === userId) {
      triggerNotify('You cannot delete your own account from this panel.', 'error');
      return;
    }
    setDeleteUserTarget({ userId, displayName, email, role });
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setDeleteBusy(true);
    try {
      const data = await adminService.deleteUser(deleteUserTarget.userId);
      if (data && data.success === false && data.message) {
        triggerNotify(data.message, 'error');
        return;
      }
      setDeleteUserTarget(null);
      triggerNotify('User removed from directory.');
      fetchData();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; detail?: string } } };
      const msg =
        ax.response?.data?.message ??
        ax.response?.data?.detail ??
        'Delete failed';
      triggerNotify(msg, 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleReject = async (id: string) => {
    const comment = prompt("Reason for rejection:");
    if (!comment) return;
    try {
      await adminService.rejectUser(id, comment);
      triggerNotify("User Request Terminated");
      fetchData();
    } catch (err) {
      triggerNotify("Action failed", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] p-4 md:p-8 font-sans text-black relative">
      
      {/* NOIR TOAST NOTIFICATION */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border flex items-center gap-4 ${notification.type === 'success' ? 'bg-black border-zinc-800 text-white' : 'bg-red-600 border-red-500 text-white'}`}
          >
            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-5xl font-[1000] tracking-tighter uppercase italic leading-none">
              MANAGIX <span className="text-[#9CA3AF] not-italic font-light">/ Admin Panel</span>
            </h1>
            <p className="text-[#9CA3AF] font-bold uppercase tracking-[0.3em] text-[9px] mt-2 ml-1">Central Administrative Authority</p>
          </div>
          
          <div className="flex flex-wrap bg-white border border-[#E5E7EB] p-1.5 rounded-2xl shadow-sm gap-1 max-w-full">
            {([
              ['overview', 'Overview'],
              ['users', `Requests [${users.length}]`],
              ['all-users', 'Directory'],
              ['projects', 'Projects'],
              ['monitoring', 'Monitoring'],
              ['payroll', 'Compensation'],
              ['all-timesheets', 'Timesheets'],
            ] as [AdminTab, string][]).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-4 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === id ? 'bg-black text-white shadow-xl' : 'text-[#9CA3AF] hover:text-black'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {(activeTab === 'overview' || activeTab === 'users' || activeTab === 'all-users') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Users', value: allApprovedUsers.length, color: 'text-black' },
            { label: 'Pending Review', value: users.length, color: 'text-black' },
            { label: 'Active Tab', value: activeTab === 'overview' ? 'Portal' : activeTab, color: 'text-indigo-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] p-6 rounded-[1.5rem] shadow-sm">
              <p className="text-[#9CA3AF] text-[9px] font-extrabold uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
        )}

        {activeTab === 'overview' && (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-10 mb-8 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#9CA3AF] mb-4">Quick access</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setTab('all-users')} className="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-zinc-800">
                User directory
              </button>
              <button type="button" onClick={() => setTab('users')} className="px-6 py-3 bg-zinc-800 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-zinc-700">
                Pending requests
              </button>
              <button type="button" onClick={() => setTab('projects')} className="px-6 py-3 bg-zinc-800 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-zinc-700">
                Projects
              </button>
              <button type="button" onClick={() => setTab('monitoring')} className="px-6 py-3 bg-zinc-800 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-zinc-700">
                Monitoring
              </button>
              <button type="button" onClick={() => setTab('payroll')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-indigo-700">
                Compensation
              </button>
              <button type="button" onClick={() => setTab('all-timesheets')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-indigo-700">
                All timesheets
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Set <strong>hourly rates</strong> under <strong>Compensation</strong> and view <strong>all timesheets</strong> in the Timesheets tab above.
              Project creation stays on the main Dashboard; use Projects here for oversight and Gantt timelines.
            </p>
          </div>
        )}

        {activeTab === 'projects' && <AdminProjectsTab />}
        {activeTab === 'monitoring' && <MonitoringPanel />}
        {activeTab === 'payroll' && <AdminHourlyRatesTab />}
        {activeTab === 'all-timesheets' && <AdminAllTimesheetsTab />}

        {(activeTab === 'users' || activeTab === 'all-users') && (
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-32 text-center">
              <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#9CA3AF] font-extrabold uppercase tracking-[0.4em] text-[10px]">Syncing Database</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#F3F4F6] bg-white">
                    <th className="px-10 py-8 text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-[0.2em]">Personnel</th>
                    <th className="px-10 py-8 text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-[0.2em]">Status</th>
                    <th className="px-10 py-8 text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-[0.2em]">Permissions</th>
                    <th className="px-10 py-8 text-[10px] font-extrabold text-[#9CA3AF] uppercase tracking-[0.2em] text-right">Execution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {(activeTab === 'users' ? users : allApprovedUsers).map((u) => {
                    const id = u.RequestId || u.UserId || u.userId;
                    const displayName = u.FullName || u.fullName || '?';
                    const displayEmail = u.Email || u.email || '';
                    return (
                      <tr key={id} className="hover:bg-[#F9FAFB] transition-all group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-2xl font-extrabold text-sm shadow-lg group-hover:scale-110 transition-transform">
                              {displayName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-extrabold text-sm uppercase tracking-tight">{displayName}</div>
                              <div className="text-[10px] text-[#9CA3AF] font-bold mt-0.5 tracking-wide">{displayEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'users' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500">
                              {activeTab === 'users' ? 'Awaiting_Auth' : 'Verified Access'}
                            </span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="relative inline-block group/select">
                            <select 
                              className="appearance-none bg-[#F3F4F6] border border-transparent hover:border-black px-5 py-2.5 pr-10 rounded-xl text-[10px] font-extrabold uppercase transition-all outline-none cursor-pointer" 
                              value={u.RoleId} 
                              onChange={(e) => {
                                if (activeTab === 'users') {
                                  setUsers(users.map(user => user.RequestId === id ? { ...user, RoleId: e.target.value } : user));
                                } else {
                                  setAllApprovedUsers(allApprovedUsers.map(user => (user.UserId || user.userId) === id ? { ...user, RoleId: e.target.value } : user));
                                }
                              }}
                            >
                              {roles.map(r => <option key={r.RoleId} value={r.RoleId}>{r.RoleName}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex justify-end gap-3">
                            {activeTab === 'users' ? (
                              <>
                                <button onClick={() => handleApprove(id, u.RoleId)} className="bg-black text-white px-6 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-[0.2em] hover:bg-[#1A1A1A] transition-all active:scale-90 shadow-lg">Authorize</button>
                                <button onClick={() => handleReject(id)} className="bg-white border border-[#E5E7EB] text-black px-6 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-90">Decline</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleApprove(id, u.RoleId)} className="bg-black text-white px-6 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-[0.2em] hover:bg-[#1A1A1A] transition-all active:scale-90 shadow-lg">Change Role</button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const roleName = roles.find((r) => r.RoleId === u.RoleId)?.RoleName;
                                    handleDeleteUser(String(id), displayName, displayEmail, roleName);
                                  }}
                                  className="bg-white border border-[#E5E7EB] text-red-600 px-6 py-2.5 rounded-xl text-[9px] font-extrabold uppercase tracking-[0.2em] hover:bg-red-50 hover:border-red-200 transition-all active:scale-90"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && (activeTab === 'users' ? users : allApprovedUsers).length === 0 && (
                <div className="p-32 text-center">
                  <p className="text-[#9CA3AF] font-extrabold uppercase tracking-[0.5em] text-[10px]">No Data Streams Found</p>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      <ConfirmDeleteModal
        open={Boolean(deleteUserTarget)}
        message={
          deleteUserTarget
            ? `Permanently delete ${deleteUserTarget.displayName}? You won't be able to revert this!`
            : undefined
        }
        details={
          deleteUserTarget
            ? [
                { label: 'Name', value: deleteUserTarget.displayName },
                ...(deleteUserTarget.email ? [{ label: 'Email', value: deleteUserTarget.email }] : []),
                ...(deleteUserTarget.role ? [{ label: 'Role', value: deleteUserTarget.role }] : []),
              ]
            : []
        }
        warning="This removes the user from the directory and cannot be undone."
        busy={deleteBusy}
        onConfirm={confirmDeleteUser}
        onCancel={() => !deleteBusy && setDeleteUserTarget(null)}
      />
    </div>
  );
};

export default AdminPortal;