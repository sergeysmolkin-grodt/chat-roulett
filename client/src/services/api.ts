import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

// Определяем типы для данных пользователя и ответа сервера (можно расширять по мере необходимости)
interface User {
  id: number;
  name: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  stripe_customer_id?: string | null;
  subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_ends_at?: string | null;
  // email_verified_at?: string | null;
  // created_at: string;
  // updated_at: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api', // Наш Laravel API
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Перехватчик для добавления токена авторизации к каждому запросу
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

const apiService = {
  register(userData: Record<string, any>) { // Типизируйте userData более строго, если это возможно
    return apiClient.post<AuthResponse>('/register', userData);
  },
  login(credentials: Record<string, any>) { // Типизируйте credentials более строго
    return apiClient.post<AuthResponse>('/login', credentials);
  },
  logout() {
    return apiClient.post<void>('/logout'); // Предполагаем, что logout не возвращает тело
  },
  getUser() {
    // В Laravel API /user возвращает просто данные пользователя, не объект AuthResponse
    return apiClient.get<{ data: User }>('/user'); 
  },
  createCheckoutSession() {
    // Укажите тип ответа, если он известен. Например:
    // interface CheckoutSessionResponse { checkout_session_id: string; stripe_public_key: string; checkout_url: string; }
    return apiClient.post<any>('/payment/create-checkout-session');
  }
  // TODO: Добавить типы для userData, credentials и ответа createCheckoutSession
};

export default apiService; 