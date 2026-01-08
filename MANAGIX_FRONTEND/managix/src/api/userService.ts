// src/api/userService.ts
import api from './axiosInstance';

export const userService = {
  getProfile: async (userId: string) => {
    const response = await api.get(`/profile/${userId}`);
    return response.data; // Return the actual user object
  },
  
updateProfile: async (userId: string, data: { 
    fullName?: string; 
    email?: string; 
    Bio?: string; 
    Skills?: string; 
    Phone?: string; 
    Address?: string; 
}) => {
    const response = await api.put(`/profile/${userId}`, data);
    return response.data;
},
uploadResume: async (payload: { userId: string; resume: string }) => {
        // This will now send a clean JSON body: {"userId": "...", "resume": "..."}
        const response = await api.post('/profile/upload-resume', payload);
        return response.data;
    },
};
