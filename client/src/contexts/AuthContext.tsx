import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import apiClient, { getCsrfCookie } from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  gender: 'male' | 'female';
  stripe_customer_id?: string | null;
  subscription_id?: string | null;
  subscription_status?: string | null; // e.g., 'active', 'canceled', 'incomplete', 'past_due'
  subscription_ends_at?: string | null;
  // Add other user fields as needed
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setToken: React.Dispatch<React.SetStateAction<string | null>>;
  login: (userData: User, authToken: string) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      await getCsrfCookie(); // Ensure CSRF cookie is set
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
          // Optionally: Verify token with a /me endpoint
          // try {
          //   const response = await apiClient.get('/user');
          //   setUser(response.data);
          // } catch (error) {
          //   console.error("Failed to verify token, logging out", error);
          //   localStorage.removeItem('authToken');
          //   localStorage.removeItem('user');
          //   setToken(null);
          //   setUser(null);
          // }
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        // Attempt to fetch CSRF cookie even if not logged in, for login/register pages
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = (userData: User, authToken: string) => {
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Call the backend logout endpoint if it exists and requires action
      // For Sanctum, usually removing the token client-side is enough for token-based auth
      // If session-based, you might need an API call: await apiClient.post('/logout');
      await apiClient.post('/logout'); // Assuming you have a /logout endpoint
    } catch (error) {
      console.error("Logout failed on server:", error);
      // Still proceed with client-side logout
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      setIsLoading(false);
       // Optionally redirect to login page, handled by consuming components
    }
  };
  
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, login, logout, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 