import axios from 'axios';

function resolveApiBaseUrl(): string {
  const env = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
  if (env) {
    // Relative /api — same origin (ngrok URL + Vite proxy to backend)
    if (env.startsWith('/')) {
      if (typeof window !== 'undefined') {
        return `${window.location.origin}${env}`;
      }
      return env;
    }
    return env;
  }
  return 'http://localhost:7005/api';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

const isNgrokHost = () =>
  typeof window !== 'undefined' &&
  /ngrok-free\.dev|ngrok\.io|ngrok\.app/i.test(window.location.hostname);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (userId) {
    config.headers['userId'] = userId;
  }

  // Ngrok free tier: skip interstitial HTML on XHR/fetch (required for /api proxy)
  if (isNgrokHost()) {
    config.headers['ngrok-skip-browser-warning'] = 'true';
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;