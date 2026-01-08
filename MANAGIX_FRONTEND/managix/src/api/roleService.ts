import api from './axiosInstance';

export const roleService = {
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },

  createRole: async (roleName: string) => {
    // Backend expects { RoleName: "..." }
    const response = await api.post('/roles', { roleName });
    return response.data;
  },

updateRole: async (id: string, roleName: string) => {
    // MATCHING YOUR BACKEND: /api/roles/{id}
    const response = await api.put(`/roles/${id}`, { 
      roleId: id,       // Keeping this in body too just in case your DTO needs it
      roleName: roleName 
    });
    return response.data;
  },

  deleteRole: async (id: string) => {
    // Backend route is "/roles/{id}" - This is correct.
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  }
};