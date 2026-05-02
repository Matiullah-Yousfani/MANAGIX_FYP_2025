import api from './axiosInstance';

/** `RoleCreateDto` */
export interface RoleCreateRequest {
  roleName: string;
  description?: string;
}

/** `UpdateUserRoleDto` — PUT `/roles/{userId}` body */
export interface UpdateUserRoleRequest {
  roleId: string;
}

export const roleService = {
  getRoles: async () => {
    const response = await api.get('/roles');
    return response.data;
  },

  createRole: async (payload: RoleCreateRequest) => {
    const response = await api.post('/roles', payload);
    return response.data;
  },

  /** Backend: `PUT /roles/{id}` where `id` is the **user** id to update. */
  updateUserRole: async (userId: string, roleId: string) => {
    const response = await api.put(`/roles/${userId}`, {
      roleId,
    } satisfies UpdateUserRoleRequest);
    return response.data;
  },

  deleteRole: async (roleId: string) => {
    const response = await api.delete(`/roles/${roleId}`);
    return response.data;
  },
};
