import api from './axiosInstance';

// Matches your C# backend: Login returns only { token }
interface LoginResponse {
  token: string;
}

// User object returned by AuthMe
export interface UserDetails {
  userId?: string;
  fullName: string;
  email: string;
  roleName: string; // C# backend
}

export const authService = {
  // 1. Login: Returns token
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  // 2. GetMe: Uses token in Authorization header
  getMe: async (): Promise<UserDetails> => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Token not found');

    const response = await api.get<UserDetails>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}` // required for backend to read UserId claim
      }
    });
    return response.data;
  },

  // 3. Register
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  }
};
