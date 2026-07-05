import api from './axiosInstance';

/** Backend login returns `{ token }` on success. */
export interface LoginResponse {
  token?: string;
  message?: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  /** Guid string */
  roleId: string;
}

export interface RegisterResponse {
  message: string;
}

/** Matches `AuthMeResponseDto` (System.Text.Json camelCase). */
export interface AuthMeResponse {
  userId: string;
  fullName: string;
  email: string;
  roleId: string;
  roleName: string;
  status: string;
}

export const authService = {
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  getMe: async (): Promise<AuthMeResponse> => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Token not found');
    }
    const response = await api.get<AuthMeResponse>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    const r = await api.post('/auth/change-password', { userId, currentPassword, newPassword });
    return r.data as { ok?: boolean; message?: string };
  },
};
