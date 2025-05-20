import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiService from '../services/apiService'; // Наш API сервис

export interface User {
  id: number;
  name: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  // добавь другие поля пользователя, если они есть
  // Например, для Stripe:
  // stripe_customer_id?: string | null;
  // stripe_subscription_id?: string | null;
  // stripe_subscription_status?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean; // Добавим для удобства
  login: (token: string, userData: User) => void;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Начальная загрузка пользователя

  const fetchUser = async () => {
    const token = localStorage.getItem('authToken');
    if (token && !user) { // Загружаем только если есть токен и пользователя еще нет
      setIsLoading(true);
      try {
        // apiService уже должен иметь интерсептор для добавления токена
        const response = await apiService.get<User>('/user');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        localStorage.removeItem('authToken'); // Удаляем невалидный токен
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Пустой массив зависимостей, чтобы выполнилось один раз при монтировании

  const login = (token: string, userData: User) => {
    localStorage.setItem('authToken', token);
    setUser(userData);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiService.post('/logout');
    } catch (error) {
      console.error("Logout failed, but clearing session locally:", error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
      // Можно также очистить другие связанные состояния, если необходимо
      // Например, echo.disconnect() если он был подключен глобально
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 