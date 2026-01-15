// src/pages/AdminPortal.tsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { adminService } from '../../api/adminService';
import api from '../../api/axiosInstance';
import { motion, AnimatePresence } from 'framer-motion'; // Ensure you run: npm install framer-motion

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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'users' | 'all-users'>('users');
  const [allApprovedUsers, setAllApprovedUsers] = useState<any[]>([]);
  const [users, setUsers] = useState<UserRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Custom Notification State
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const roleRes = await api.get('/roles');
      const systemRoles = roleRes.data;
      setRoles(systemRoles);

      const pendingList = await adminService.getPendingUsers();
      const sanitizedPending = Array.isArray(pendingList) ? pendingList.map(u => {
        const isInvalid = u.RoleId === "00000000-0000-0000-0000-000000000000" || !u.RoleId;
        const defaultRole = systemRoles.find((r: any) => r.RoleName === 'Employee') || systemRoles[0];
        return {
          ...u,
          RequestId: u.RequestId || u.UserId || u.userId,
          RoleId: isInvalid ? (defaultRole?.RoleId || "") : u.RoleId
        };
      }) : [];
      setUsers(sanitizedPending);

      const fullUserList = await adminService.getAllUsers();
      const approvedOnly = Array.isArray(fullUserList) ? fullUserList.map(u => ({
        ...u,
        UserId: u.UserId || u.userId,
        FullName: u.FullName || u.fullName,
        Email: u.Email || u.email,
        RoleId: u.RoleId || (u.UserRoles && u.UserRoles.length > 0 ? u.UserRoles[0].RoleId : null)
      })) : [];
      setAllApprovedUsers(approvedOnly);
    } catch (err) {
      triggerNotify("Failed to sync database", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setActiveTab(params.get('tab') === 'all-users' ? 'all-users' : 'users');
  }, [location]);

  const handleApprove = async (id: string, roleId: string) => {
    try {
      await adminService.approveUser(id, "User approved by administrator", roleId);
      triggerNotify("Authorization Granted Successfully");
      fetchData();
    } catch (err) {
      triggerNotify("Authorization failed", "error");
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{notification.msg}</span>
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
          
          <div className="flex bg-white border border-[#E5E7EB] p-1.5 rounded-2xl shadow-sm">
            <button 
              onClick={() => setActiveTab('users')} 
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-black text-white shadow-xl' : 'text-[#9CA3AF] hover:text-black'}`}
            >
              Requests [{users.length}]
            </button>
            <button 
              onClick={() => setActiveTab('all-users')} 
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all-users' ? 'bg-black text-white shadow-xl' : 'text-[#9CA3AF] hover:text-black'}`}
            >
              Directory
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Users', value: allApprovedUsers.length, color: 'text-black' },
            { label: 'Pending Review', value: users.length, color: 'text-black' },
            
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] p-6 rounded-[1.5rem] shadow-sm">
              <p className="text-[#9CA3AF] text-[9px] font-black uppercase tracking-widest">{stat.label}</p>
              <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* DATA TABLE CARD */}
        <div className="bg-white rounded-[2.5rem] border border-[#E5E7EB] shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-32 text-center">
              <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#9CA3AF] font-black uppercase tracking-[0.4em] text-[10px]">Syncing Database</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#F3F4F6] bg-white">
                    <th className="px-10 py-8 text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Personnel</th>
                    <th className="px-10 py-8 text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Status</th>
                    <th className="px-10 py-8 text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em]">Permissions</th>
                    <th className="px-10 py-8 text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.2em] text-right">Execution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {(activeTab === 'users' ? users : allApprovedUsers).map((u) => {
                    const id = u.RequestId || u.UserId || u.userId;
                    return (
                      <tr key={id} className="hover:bg-[#F9FAFB] transition-all group">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-2xl font-black text-sm shadow-lg group-hover:scale-110 transition-transform">
                              {u.FullName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-black text-sm uppercase tracking-tight">{u.FullName}</div>
                              <div className="text-[10px] text-[#9CA3AF] font-bold mt-0.5 tracking-wide">{u.Email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'users' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                              {activeTab === 'users' ? 'Awaiting_Auth' : 'Verified Access'}
                            </span>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="relative inline-block group/select">
                            <select 
                              className="appearance-none bg-[#F3F4F6] border border-transparent hover:border-black px-5 py-2.5 pr-10 rounded-xl text-[10px] font-black uppercase transition-all outline-none cursor-pointer" 
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
                                <button onClick={() => handleApprove(id, u.RoleId)} className="bg-black text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#1A1A1A] transition-all active:scale-90 shadow-lg">Authorize</button>
                                <button onClick={() => handleReject(id)} className="bg-white border border-[#E5E7EB] text-black px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-90">Decline</button>
                              </>
                            ) : (
                              <button onClick={() => handleApprove(id, u.RoleId)} className="bg-black text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[#1A1A1A] transition-all active:scale-90 shadow-lg">Change Role</button>
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
                  <p className="text-[#9CA3AF] font-black uppercase tracking-[0.5em] text-[10px]">No Data Streams Found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;