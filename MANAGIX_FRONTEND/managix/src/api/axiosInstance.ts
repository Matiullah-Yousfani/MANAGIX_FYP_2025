import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:7005/api', // Ensure this matches your port
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // CRITICAL FIX: Add the header your C# code is looking for
  if (userId) {
    config.headers['userId'] = userId;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;