import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
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

const PaymentSuccessPage = () => <div className="p-4 text-white"><h1>Payment Successful!</h1><p>Your subscription is active.</p><a href="/">Go to Dashboard</a></div>;
const PaymentCancelPage = () => <div className="p-4 text-white"><h1>Payment Cancelled</h1><p>Your payment was not processed. You can try again.</p><a href="/premium">Go to Premium</a></div>;

const queryClient = new QueryClient();

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-rulet-dark"><Progress value={50} className="w-1/2" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

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
