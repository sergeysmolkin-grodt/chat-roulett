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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Define a function to fetch CSRF cookie for Sanctum
export const getCsrfCookie = async () => {
  try {
    await axios.get('http://localhost:8000/sanctum/csrf-cookie', {
      withCredentials: true,
    });
    console.log('CSRF cookie fetched');
  } catch (error) {
    console.error('Error fetching CSRF cookie:', error);
  }
};

export default apiClient; 