import api from './axiosInstance';

// Matches your C# backend: [Function("Login")] returns only { token }
interface LoginResponse {
  token: string;
}

// Matches the User object returned by your C# [Function("AuthMe")]
export interface UserDetails {
  userId?: string;
  fullName: string;
  email: string;
  roleName: string; // Adjusted to common C# naming, can use userDetails.roleName || userDetails.role
}

export const authService = {
  // 1. Login: Only returns the token
  login: async (credentials: { email: string; password: any }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  // 2. GetMe: Uses the token (via axiosInstance interceptor) to get profile
  getMe: async (): Promise<UserDetails> => {
    const response = await api.get<UserDetails>('/auth/me');
    return response.data;
  },

  // 3. Register: Sends data to auth/register
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  }
};