import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { adminService } from '../../api/adminService';
import { roleService } from '../../api/roleService';
import api from '../../api/axiosInstance';

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
 const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'all-users'>('users');
const [allApprovedUsers, setAllApprovedUsers] = useState<any[]>([]);
  const [users, setUsers] = useState<UserRequest[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState('');

const fetchData = async () => {
  setLoading(true);
  try {
    // 1. Fetch System Roles
    const roleRes = await api.get('/roles');
    const systemRoles = roleRes.data;
    setRoles(systemRoles);

    // 2. Fetch Pending Users (For the "User Requests" tab)
    const pendingList = await adminService.getPendingUsers();
    
    // Sanitize the pending list to fix invalid/Zero GUIDs
    const sanitizedPending = Array.isArray(pendingList) ? pendingList.map(u => {
      const isInvalid = u.RoleId === "00000000-0000-0000-0000-000000000000" || !u.RoleId;
      const defaultRole = systemRoles.find((r: any) => r.RoleName === 'Employee') || systemRoles[0];

      return {
        ...u,
        RequestId: u.RequestId || u.UserId || u.userId, // Ensure ID is consistent
        RoleId: isInvalid ? (defaultRole?.RoleId || "") : u.RoleId
      };
    }) : [];
    setUsers(sanitizedPending);

    // 3. Fetch ALL Users (For the new "Approved Users" tab)
    // This will bring in Jon, Snow, Meesam, etc. from your database
  const fullUserList = await adminService.getAllUsers();

const approvedOnly = Array.isArray(fullUserList) ? fullUserList.map(u => {
  return {
    ...u,
    UserId: u.UserId || u.userId,
    FullName: u.FullName || u.fullName,
    Email: u.Email || u.email,
    // FIX: Use the RoleId directly from the user object (the column we added)
    // and fallback to the old method ONLY if the new one is missing.
    RoleId: u.RoleId || (u.UserRoles && u.UserRoles.length > 0 ? u.UserRoles[0].RoleId : null)
  };
}) : [];

setAllApprovedUsers(approvedOnly);

  } catch (err) {
    console.error("Failed to fetch data:", err);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'roles') {
      setActiveTab('roles');
    } else {
      setActiveTab('users');
    }
  }, [location]);

const getRoleName = (roleId: string) => {
  if (!roleId) return 'Pending';
  
  const role = roles.find(r => 
    r.RoleId.toLowerCase().trim() === roleId.toLowerCase().trim()
  );
  
  return role ? role.RoleName : 'Pending';
};

  const handleApprove = async (id: string, roleId: string) => {
    try {
      await adminService.approveUser(id, "User approved by administrator", roleId);
      alert('User approved successfully!');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Approval failed.');
    }
  };

  const handleReject = async (id: string) => {
    const comment = prompt("Please enter a reason for rejection:");
    if (comment === null) return;
    if (comment.trim() === "") {
      alert("A reason is required to reject a user.");
      return;
    }
    try {
      await adminService.rejectUser(id, comment);
      alert('User has been rejected.');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Rejection failed.');
    }
  };

const handleUpdateRole = async (id: string) => {
  if (!editRoleName.trim()) return;
  try {
    // This calls the service we just updated above
    await roleService.updateRole(id, editRoleName);
    
    setEditingRoleId(null); // Close the edit input
    fetchData();            // Refresh the list to show the new name
  } catch (err) {
    console.error("Update failed", err);
    alert("Failed to update role. Check console for details.");
  }
};
  const handleCreateRole = async (name: string) => {
    if (!name) return;
    try {
      await roleService.createRole(name);
      setNewRoleName('');
      fetchData();
    } catch (err) {
      alert("Failed to create role");
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (window.confirm("Delete this role?")) {
      try {
        await roleService.deleteRole(id);
        fetchData();
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

return (
    <div className="p-8 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Portal</h1>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md font-bold ${activeTab === 'users' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>User Requests</button>
          <button onClick={() => setActiveTab('all-users')} className={`px-4 py-2 rounded-md font-bold ${activeTab === 'all-users' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Approved Users</button>
          <button onClick={() => setActiveTab('roles')} className={`px-4 py-2 rounded-md font-bold ${activeTab === 'roles' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Manage Roles</button>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600">User Details</th>
                <th className="p-4 font-semibold text-gray-600">Requested Role</th>
                <th className="p-4 font-semibold text-gray-600">Assign Final Role</th>
                <th className="p-4 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.RequestId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{u.FullName}</div>
                    <div className="text-xs text-gray-400">{u.Email}</div>
                  </td>
                  <td className="p-4 italic text-gray-50">{getRoleName(u.RoleId)}</td>
                  <td className="p-4">
                    <select className="border p-1 rounded text-sm bg-white" value={u.RoleId} onChange={(e) => setUsers(users.map(user => user.RequestId === u.RequestId ? { ...user, RoleId: e.target.value } : user))}>
                      {roles.map(r => <option key={r.RoleId} value={r.RoleId}>{r.RoleName}</option>)}
                    </select>
                  </td>
                  <td className="p-4 space-x-2 flex">
                    <button onClick={() => handleApprove(u.RequestId, u.RoleId)} className="bg-black text-white px-4 py-1.5 rounded-lg text-sm font-bold">Approve</button>
                    <button onClick={() => handleReject(u.RequestId)} className="border-2 border-red-500 text-red-500 px-4 py-1.5 rounded-lg text-sm font-bold">Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'all-users' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Full Name</th>
                <th className="p-4 font-semibold text-gray-600">Email Address</th>
                <th className="p-4 font-semibold text-gray-600">Current Role</th>
                <th className="p-4 font-semibold text-gray-600">Update Role</th>
              </tr>
            </thead>
            <tbody>
              {allApprovedUsers.map(u => (
                <tr key={u.UserId || u.userId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-bold text-gray-800 uppercase text-sm">{u.FullName}</td>
                  <td className="p-4 text-gray-600">{u.Email}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getRoleName(u.RoleId) === 'Pending' ? 'bg-gray-100 text-gray-400' : 'bg-black text-white'}`}>
                      {getRoleName(u.RoleId)}
                    </span>
                  </td>
                  <td className="p-4 flex items-center gap-2">
                    <select 
                      className="border p-1 rounded text-xs bg-white" 
                      value={u.RoleId || ""} 
                      onChange={(e) => setAllApprovedUsers(allApprovedUsers.map(user => (user.UserId || user.userId) === (u.UserId || u.userId) ? { ...user, RoleId: e.target.value } : user))}
                    >
                      <option value="">Select Role</option>
                      {roles.map(r => <option key={r.RoleId} value={r.RoleId}>{r.RoleName}</option>)}
                    </select>
                    <button onClick={() => handleApprove(u.UserId || u.userId, u.RoleId)} className="bg-gray-800 text-white px-3 py-1 rounded text-[10px] font-bold hover:bg-black uppercase">Update</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}  {/* 3. ROLE MANAGEMENT TAB */}
      {activeTab === 'roles' && (
        <div className="max-w-2xl">
          <div className="mb-6 flex gap-3">
            <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Enter Role Name (e.g. QA)" className="flex-1 border p-3 rounded-xl focus:ring-2 ring-black outline-none" />
            <button onClick={() => handleCreateRole(newRoleName)} className="bg-black text-white px-6 py-3 rounded-xl font-bold">Add Role</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {["Manager", "Employee", "QA", "Admin"].map(suggested => (
              <button key={suggested} onClick={() => handleCreateRole(suggested)} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest">+ {suggested}</button>
            ))}
          </div>
          <div className="mt-8 space-y-2">
            {roles.map((r) => (
              <div key={r.RoleId} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                {editingRoleId === r.RoleId ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      value={editRoleName}
                      onChange={(e) => setEditRoleName(e.target.value)}
                      className="flex-1 p-2 border-2 border-blue-100 rounded-lg focus:outline-none focus:border-blue-400 font-bold"
                      autoFocus
                    />
                    <button onClick={() => handleUpdateRole(r.RoleId)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-black uppercase tracking-wider">Save</button>
                    <button onClick={() => { setEditingRoleId(null); setEditRoleName(""); }} className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-black uppercase tracking-wider">Cancel</button>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-gray-800">{r.RoleName}</span>
                    <div className="flex gap-4">
                      <button onClick={() => { setEditingRoleId(r.RoleId); setEditRoleName(r.RoleName); }} className="text-blue-500 text-sm font-black hover:underline">EDIT</button>
                      <button onClick={() => handleDeleteRole(r.RoleId)} className="text-red-500 text-sm font-black hover:underline">DELETE</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;