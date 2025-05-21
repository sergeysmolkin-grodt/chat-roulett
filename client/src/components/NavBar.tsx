import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Users, MessageCircle, Store, Settings, Star, LogOut, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isPremiumUser = user?.subscription_status === 'active';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const isActive = (path: string) => {
    return location.pathname === path || (path === '/categories' && location.pathname.startsWith('/categories'));
  };
  
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-t border-rulet-purple/20 flex justify-around items-center px-2 sm:px-4 z-20">
      <Link to="/chat" className={`nav-button ${isActive('/chat') ? 'active' : ''}`}>
        <MessageCircle size={20} className="mb-0.5 sm:mb-1" />
        <span className="text-xs sm:text-sm">Chat</span>
      </Link>
      
      <Link to="/categories" className={`nav-button ${isActive('/categories') ? 'active' : ''}`}>
        <Home size={20} className="mb-0.5 sm:mb-1" />
        <span className="text-xs sm:text-sm">Rooms</span>
      </Link>
      
      <Link to="/friends" className={`nav-button ${isActive('/friends') ? 'active' : ''}`}>
        <Users size={20} className="mb-0.5 sm:mb-1" />
        <span className="text-xs sm:text-sm">Friends</span>
      </Link>
      
      <Link to="/shop" className={`nav-button ${isActive('/shop') ? 'active' : ''}`}>
        <Store size={20} className="mb-0.5 sm:mb-1" />
        <span className="text-xs sm:text-sm">Shop</span>
      </Link>
      
      <Link to="/settings" className={`nav-button ${isActive('/settings') ? 'active' : ''}`}>
        <Settings size={20} className="mb-0.5 sm:mb-1" />
        <span className="text-xs sm:text-sm">Settings</span>
      </Link>
      
      {isAuthenticated && (
        <Button variant="ghost" onClick={handleLogout} className="nav-button text-red-500 hover:text-red-400">
          <LogOut size={20} className="mb-0.5 sm:mb-1" />
          <span className="text-xs sm:text-sm">Logout</span>
        </Button>
      )}
    </div>
  );
};

export default NavBar;
