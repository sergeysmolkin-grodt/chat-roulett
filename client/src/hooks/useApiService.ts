import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
// import { useAuth } from '@/contexts/AuthContext'; // Not needed if we get token from localStorage directly

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const useApiService = (): AxiosInstance => {
  // const { token } = useAuth(); // Not available directly from context

  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('authToken'); // Get token from localStorage
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // console.log('API Request:', config.method?.toUpperCase(), config.url, config.data);
      return config;
    },
    (error) => {
      // console.error('API Request Error:', error);
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      // console.log('API Response:', response.status, response.config.url, response.data);
      return response;
    },
    (error) => {
      // console.error('API Response Error:', error.response?.status, error.config.url, error.response?.data);
      if (error.response && error.response.status === 401) {
        console.error('Unauthorized access - 401. Token might be invalid or expired.');
        // Potentially logout user or trigger token refresh
        // Consider dispatching a custom event or calling a global logout function if needed,
        // as directly calling useAuth().logout() here would be a hook call inside a non-component function.
        // For simplicity, just logging error now.
        // localStorage.removeItem('authToken'); // Or let AuthContext handle this
        // localStorage.removeItem('authUser');
        // window.location.href = '/login'; // Or use react-router programmatically if possible
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export default useApiService; 