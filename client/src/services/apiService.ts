import axios from 'axios';

const VITE_API_BASE_URL = 'http://localhost:8081/api';

const apiService = axios.create({
  baseURL: VITE_API_BASE_URL,
  withCredentials: true, // Очень важно для Laravel Sanctum и Echo broadcasting auth
  headers: {
    'X-Requested-With': 'XMLHttpRequest', // Важно для Laravel, чтобы он понимал, что это AJAX запрос
    'Accept': 'application/json',
  },
});

// Можно добавить interceptors для обработки токенов или ошибок глобально, если нужно
// Например, для автоматического обновления CSRF токена, если используется Sanctum с CSRF
// Или для обработки 401/403 ошибок

// Получение CSRF cookie при необходимости (Sanctum требует для некоторых запросов, если не API-токены)
// Обычно для SPA с Sanctum, первый запрос к /sanctum/csrf-cookie устанавливает cookie
export const fetchCsrfToken = async () => {
  try {
    await axios.get('http://localhost:8081/sanctum/csrf-cookie', {
      withCredentials: true,
    });
    console.log('CSRF cookie fetched');
  } catch (error) {
    console.error('Failed to fetch CSRF cookie:', error);
  }
};


// Перехватчик для добавления токена авторизации из localStorage (если используется token-based auth с Sanctum)
apiService.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken'); // Предполагаем, что токен хранится здесь
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Friend Management
export const getFriends = () => apiService.get('/friends');
export const getPendingFriendRequests = () => apiService.get('/friends/pending');
export const sendFriendRequest = (recipientId: number) => apiService.post(`/friends/send-request/${recipientId}`);
export const acceptFriendRequest = (friendshipId: number) => apiService.post(`/friends/accept-request/${friendshipId}`);
export const rejectOrRemoveFriend = (friendUserId: number) => apiService.post(`/friends/reject-remove/${friendUserId}`);
export const searchUsers = (term: string) => apiService.get('/users/search', { params: { term } });

// Video Chat
export const findPartner = (params: { room: string, gender: string, preferGender: string }) => apiService.post('/chat/find-partner', params);
export const stopSearch = () => apiService.post('/chat/stop-search');

// Categories
export const getCategories = () => apiService.get('/categories');
export const createCategory = (data: { name: string; description?: string }) => apiService.post('/categories', data);

// Обновление профиля пользователя
export const updateUserProfile = (data: Partial<{
  name: string;
  username: string;
  email: string;
  gender: string;
  password?: string;
  password_confirmation?: string;
  city?: string;
  age?: number;
  bio?: string;
  interests?: string[];
}>) => apiService.put('/user', data);

export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);
  return apiService.post('/user/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export default apiService; 