import axios from 'axios';

// Get base URL from environment or fall back to production Render backend if on Vercel
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // When running deployed on Vercel and VITE_API_URL wasn't set, default to your Render backend
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://school-library-management-system-1.onrender.com';
  }
  return '';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
});

// Attach Authorization header if JWT token is stored in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register') &&
        !error.config.url.includes('/api/auth/me')
      ) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
