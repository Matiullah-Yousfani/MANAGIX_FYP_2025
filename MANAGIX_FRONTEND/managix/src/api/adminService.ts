import api from './axiosInstance';

export const adminService = {
  getPendingUsers: async () => {
    const res = await api.get('/management/pending-users');
    return res.data;
  },

  /** PUT path includes roleId: `/management/approve-user/{requestOrUserId}/{roleId}` */
  approveUser: async (requestOrUserId: string, roleId: string) => {
    const response = await api.put(
      `/management/approve-user/${requestOrUserId}/${roleId}`
    );
    return response.data;
  },

  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  rejectUser: async (id: string, comment: string) => {
    const res = await api.put(`/management/reject-user/${id}`, { comment });
    return res.data;
  },

  getAdminProjectDetailPage: async (projectId: string) => {
    const res = await api.get(`/projects/admin/${projectId}`);
    return res.data;
  },

  deleteUser: async (userId: string) => {
    const res = await api.delete(`/management/users/${userId}`);
    return res.data;
  },
};
