import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { Toaster } from '@/components/ui/toaster'; 
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NavBar from './components/NavBar';
import Index from './pages/Index';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PremiumPage from './pages/PremiumPage';
import ShopPage from './pages/ShopPage';
import VideoChatPage from './pages/VideoChatPage';
import CategoriesPage from "./pages/CategoriesPage";
import UserProfilePage from "./pages/UserProfilePage";
import UserSettingsPage from "./pages/UserSettingsPage";
import FriendsPage from "./pages/FriendsPage";
import NotFound from "./pages/NotFound";
import WelcomePage from './pages/WelcomePage';
import { Button } from './components/ui/button';
import { Loader2 } from 'lucide-react';
import apiService from './services/apiService';
import { useTranslation } from 'react-i18next';
import './App.css';

const PaymentSuccessPage = () => {
  const { fetchUser } = useAuth();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-2xl font-bold text-green-500">Payment Successful!</h1>
      <p>Your subscription has been activated.</p>
      <Button onClick={() => window.location.href = '/'} className="mt-4">Go to Homepage</Button>
    </div>
  );
};

const PaymentCancelPage = () => (
  <div className="container mx-auto p-4 text-center">
    <h1 className="text-2xl font-bold text-red-500">Payment Cancelled</h1>
    <p>Your payment was not processed. You can try again from the premium page.</p>
    <Button onClick={() => window.location.href = '/premium'} className="mt-4">Try Again</Button>
  </div>
);

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-rulet-dark text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const App = () => {
  const { user, isLoading, fetchUser, isAuthenticated } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      const token = localStorage.getItem('authToken');
      if (token && !user && !isAuthenticated) {
        apiService.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchUser();
      }
    };
    if (!isLoading && !user && localStorage.getItem('authToken')) {
      initializeApp();
    }
  }, [fetchUser, isAuthenticated, user, isLoading]);

  if (isLoading && !user && typeof window !== 'undefined' && localStorage.getItem('authToken')) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-rulet-dark text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-rulet-bg text-white">
     
        <div className="custom-app-bg" />
        <div className="custom-app-bg-overlay" />
        {isAuthenticated && <NavBar />}
        <main className={`flex-grow ${isAuthenticated ? 'pb-16' : ''}`}>
          <Routes>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
            <Route path="/" element={isAuthenticated ? <Index /> : <Navigate to="/welcome" />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/chat" element={<VideoChatPage />} />
              <Route path="/premium" element={<PremiumPage />} />
              <Route path="/profile" element={<UserProfilePage />} />
              <Route path="/profile/:userId" element={<UserProfilePage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
            </Route>
            <Route path="/payment/cancel" element={<PaymentCancelPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Toaster />
        <SonnerToaster richColors />
      </div>
    </Router>
  );
};

const RootApp = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default RootApp;
