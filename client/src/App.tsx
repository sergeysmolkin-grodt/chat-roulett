import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, Outlet, Link as RouterLink } from "react-router-dom";
import Index from "./pages/Index";
import VideoChatPage from "./pages/VideoChatPage";
import PremiumPage from "./pages/PremiumPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserProfilePage from "./pages/UserProfilePage";
import UserSettingsPage from "./pages/UserSettingsPage";
import FriendsPage from "./pages/FriendsPage";
import ShopPage from "./pages/ShopPage";
import NotFound from "./pages/NotFound";
import { useAuth } from "./contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import NavBar from "./components/NavBar";
import { useEffect } from "react";

const PaymentSuccessPage = () => {
  const { refreshUser, isLoading } = useAuth();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  if (isLoading) {
    return <div className="p-4 text-white text-center"><h1>Обновляем ваш статус...</h1><Progress value={66} className="w-1/2 mx-auto mt-4" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rulet-dark p-4 text-white">
      <div className="bg-black/50 backdrop-blur-md p-8 rounded-lg shadow-xl text-center border border-green-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-3xl font-bold text-green-400 mb-2">Платеж успешен!</h1>
        <p className="text-lg text-gray-300 mb-6">Ваша Premium подписка активирована. Спасибо!</p>
        <RouterLink to="/chat" className="bg-rulet-purple hover:bg-rulet-purple-dark text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out mr-2">
          Начать чат
        </RouterLink>
        <RouterLink to="/premium" className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          К странице Premium
        </RouterLink>
      </div>
    </div>
  );
};

const PaymentCancelPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-rulet-dark p-4 text-white">
    <div className="bg-black/50 backdrop-blur-md p-8 rounded-lg shadow-xl text-center border border-red-500">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h1 className="text-3xl font-bold text-red-400 mb-2">Платеж отменен</h1>
      <p className="text-lg text-gray-300 mb-6">Ваш платеж не был обработан или был отменен. Вы можете попробовать снова.</p>
      <RouterLink to="/premium" className="bg-rulet-purple hover:bg-rulet-purple-dark text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
        Вернуться к Premium
      </RouterLink>
    </div>
  </div>
);

const queryClient = new QueryClient();

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('[ProtectedRoute] Check:', { isAuthenticated, isLoading, user });

  if (isLoading) {
    console.log('[ProtectedRoute] isLoading is true, showing Progress');
    return <div className="min-h-screen flex items-center justify-center bg-rulet-dark"><Progress value={50} className="w-1/2" /></div>;
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, navigating to /login');
    return <Navigate to="/login" replace />;
  }
  
  console.log('[ProtectedRoute] Authenticated, rendering Outlet');
  return <Outlet />;
};

const App = () => {
  const { isLoading: authIsLoading, isAuthenticated, user } = useAuth();
  
  if (authIsLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-rulet-dark"><Progress value={33} className="w-1/2" /></div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="flex flex-col min-h-screen bg-rulet-dark">
          <main className="flex-grow">
            <Routes>
              <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
              <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
              
              <Route path="/" element={<Index />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/chat" element={<VideoChatPage />} />
                <Route path="/premium" element={<PremiumPage />} />
                <Route path="/profile" element={<UserProfilePage />} />
                <Route path="/settings" element={<UserSettingsPage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
                <Route path="/payment/cancel" element={<PaymentCancelPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          {isAuthenticated && <NavBar />}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
