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
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async (currentToken: string): Promise<User | null> => {
    console.log('[AuthContext] fetchUser called with token:', currentToken ? 'Exists' : 'None');
    if (!currentToken) {
      setUser(null);
      localStorage.removeItem('user');
      console.log('[AuthContext] fetchUser: No token, user set to null');
      return null;
    }
    try {
      const response = await apiClient.get('/user');
      const userData = response.data as User;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('[AuthContext] fetchUser: User data fetched and set:', userData);
      return userData;
    } catch (error) {
      console.error("[AuthContext] Failed to fetch user data:", error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      console.log('[AuthContext] fetchUser: Error, token/user removed, user set to null');
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthContext] initializeAuth started');
      setIsLoading(true);
      await getCsrfCookie();
      const storedToken = localStorage.getItem('authToken');
      console.log('[AuthContext] initializeAuth - storedToken:', storedToken ? 'Exists' : 'None');
      
      let fetchedUserData: User | null = null;
      if (storedToken) {
        setToken(storedToken);
        fetchedUserData = await fetchUser(storedToken);
      } else {
        setUser(null); 
        console.log('[AuthContext] initializeAuth: No token, user set to null');
      }
      console.log('[AuthContext] initializeAuth completed:', { token: storedToken, user: fetchedUserData });
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  const login = (userData: User, authToken: string) => {
    console.log('[AuthContext] login called:', { userData, authToken });
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
    console.log('[AuthContext] login completed, state updated.');
  };

  const logout = async () => {
    console.log('[AuthContext] logout called');
    setIsLoading(true);
    const currentToken = token; 
    try {
      if (currentToken) {
         await apiClient.post('/logout');
         console.log('[AuthContext] logout: Server logout successful');
      }      
    } catch (error) {
      console.error("[AuthContext] Logout failed on server:", error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      console.log('[AuthContext] logout: Token/user removed, state updated.');
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    console.log('[AuthContext] refreshUser called');
    setIsLoading(true);
    const currentToken = localStorage.getItem('authToken'); 
    let refreshedUserData: User | null = null;
    if (currentToken) {
      refreshedUserData = await fetchUser(currentToken);
    }
    console.log('[AuthContext] refreshUser completed:', { user: refreshedUserData });
    setIsLoading(false);
  };
  
  const isAuthenticated = !!token && !!user;
  // Add a log to see when isAuthenticated changes
  // console.log('[AuthContext] isAuthenticated check:', { token: !!token, user: !!user, isAuthenticated });

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken, login, logout, refreshUser, isLoading, isAuthenticated }}>
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