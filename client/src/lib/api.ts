import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api', // Your Laravel backend URL
  withCredentials: true, // Important for Sanctum
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('[API Interceptor] Token from localStorage:', token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API Interceptor] Authorization header set:', config.headers.Authorization);
    } else {
      console.log('[API Interceptor] No token found in localStorage.');
    }
    return config;
  },
  (error) => {
    console.log('[API Interceptor] Request error:', error);
    return Promise.reject(error);
  }
);

// Define a function to fetch CSRF cookie for Sanctum
export const getCsrfCookie = async () => {
  try {
    console.log('[API getCsrfCookie] Attempting to fetch CSRF cookie...');
    await axios.get('http://localhost:8000/sanctum/csrf-cookie', {
      withCredentials: true,
    });
    console.log('[API getCsrfCookie] CSRF cookie fetched successfully.');
  } catch (error) {
    console.error('[API getCsrfCookie] Error fetching CSRF cookie:', error);
  }
};

export default apiClient; 