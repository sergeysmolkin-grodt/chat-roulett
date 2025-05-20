import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api', // Наш Laravel API
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Перехватчик для добавления токена авторизации к каждому запросу
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

const apiMethods = {
  register(userData) {
    return apiClient.post('/register', userData);
  },
  login(credentials) {
    return apiClient.post('/login', credentials);
  },
  logout() {
    return apiClient.post('/logout');
  },
  getUser() {
    return apiClient.get('/user');
  }
  // Здесь можно будет добавить другие методы API по мере необходимости
};

export default apiMethods; 