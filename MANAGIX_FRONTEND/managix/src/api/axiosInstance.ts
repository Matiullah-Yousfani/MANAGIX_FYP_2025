import axios from 'axios';

// This creates a reusable 'api' object
const api = axios.create({
  baseURL: 'http://localhost:7005/api', // This matches your Azure Functions port
  headers: {
    'Content-Type': 'application/json',
  },
});

// This interceptor automatically adds your token to every request 
// so you can use functions like 'AuthMe' or 'CreateProject'
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;