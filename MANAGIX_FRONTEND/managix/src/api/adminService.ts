import api from './axiosInstance';

export const adminService = {
  getPendingUsers: async () => {
    const res = await api.get('/management/pending-users');
    return res.data;
  },

  approveUser: async (requestId: string, message: string = "Approved", roleId: string) => {
    const response = await api.put(`/management/approve-user/${requestId}/${roleId}`);
    return response.data;
  },

  getAllUsers: async () => {
    const response = await api.get('/users'); 
    return response.data;
  },

  rejectUser: async (id: string, comment: string) => {
    const res = await api.put(`/management/reject-user/${id}`, { 
      Comment: comment 
    });
    return res.data;
  },

  // ✅ NEW FUNCTION: Get Admin Project Detail Page
  getAdminProjectDetailPage: async (projectId: string) => {
    const res = await api.get(`/projects/admin/${projectId}`);
    return res.data;
  },
};
