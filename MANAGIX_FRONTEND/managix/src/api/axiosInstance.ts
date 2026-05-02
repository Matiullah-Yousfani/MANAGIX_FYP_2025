import axios from 'axios';

/** Match `Host.LocalHttpPort` in backend `local.settings.json` (default here is 7005). */
const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:7005/api';

const api = axios.create({
  baseURL,
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