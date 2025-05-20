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
  login: (userData: User, token: string) => void;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Начальная загрузка пользователя

  // Восстанавливаем пользователя из localStorage при инициализации
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUser = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsLoading(true);
      try {
        const response = await apiService.get<User>('/user');
        setUser(response.data);
        localStorage.setItem('authUser', JSON.stringify(response.data));
      } catch (error) {
        console.error('Failed to fetch user:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        setUser(null);
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  };

  const login = (userData: User, token: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(userData));
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
      localStorage.removeItem('authUser');
      setUser(null);
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