import api from './axiosInstance';

/** `ProfileUpdateDto` — only these fields are persisted server-side */
export interface ProfileUpdateRequest {
  skills?: string;
  phone?: string;
  address?: string;
  education?: string;
  experience?: string;
  bio?: string;
}

/** `ResumeUploadDto` */
export interface ResumeUploadRequest {
  userId: string;
  resume: string;
}

export const userService = {
  getProfile: async (userId: string) => {
    const response = await api.get(`/profile/${userId}`);
    return response.data;
  },

  updateProfile: async (userId: string, data: ProfileUpdateRequest) => {
    const response = await api.put(`/profile/${userId}`, data);
    return response.data;
  },

  uploadResume: async (payload: ResumeUploadRequest) => {
    const response = await api.post('/profile/upload-resume', payload);
    return response.data;
  },
};
