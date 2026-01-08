import api from './axiosInstance';

export const adminService = {
  getPendingUsers: async () => {
    const res = await api.get('/management/pending-users');
    return res.data;
  },

approveUser: async (requestId: string, message: string = "Approved", roleId: string) => {
    // FIX: Move roleId from the body into the URL path to match 
    // the backend route: /management/approve-user/{id}/{roleId}
    const response = await api.put(`/management/approve-user/${requestId}/${roleId}`);
    
    return response.data;
},

// ✅ ADD THIS NEW FUNCTION
  getAllUsers: async () => {
    const response = await api.get('/users'); 
    return response.data;
  },

  rejectUser: async (id: string, comment: string) => {
    // FIX: PascalCase key for Comment
    const res = await api.put(`/management/reject-user/${id}`, { 
      Comment: comment 
    });
    return res.data;
  }
};