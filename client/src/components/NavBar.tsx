import React from 'react';
import { MessageCircle, Users, ShoppingCart, Settings, LogOut, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();

  if (!isAuthenticated) return null;

  // Для logout через настройки или отдельную кнопку
  // const handleLogout = async () => {
  //   await logout();
  //   navigate('/login');
  // };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1d27] z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] rounded-t-3xl">
      <div className="max-w-md mx-auto px-4 pb-2 pt-1">
        <div className="flex items-center justify-between">
          <NavbarItem 
            icon={<Home size={24} />} 
            href="/categories" 
            label={t('nav.rooms')}
            isActive={location.pathname.startsWith('/categories')}
          />
          <NavbarItem 
            icon={<Users size={24} />} 
            href="/friends" 
            label={t('nav.friends')}
            isActive={location.pathname.startsWith('/friends')}
          />
          <NavbarCenterButton label={t('nav.chat')} />
          <NavbarItem 
            icon={<ShoppingCart size={24} />} 
            href="/shop" 
            label={t('nav.shop')}
            isActive={location.pathname.startsWith('/shop')}
          />
          <NavbarItem 
            icon={<Settings size={24} />} 
            href="/profile" 
            label={t('nav.profile') || 'Profile'}
            isActive={location.pathname.startsWith('/profile')}
          />
        </div>
      </div>
    </div>
  );
};

type NavbarItemProps = {
  icon: React.ReactNode;
  href: string;
  label: string;
  isActive?: boolean;
  children?: React.ReactNode;
};

const NavbarItem = ({ icon, href, label, isActive, children }: NavbarItemProps) => {
  return (
    <Link 
      to={href}
      className={cn(
        "relative flex flex-col items-center justify-center w-14 h-16 text-gray-500 transition-all duration-200",
        isActive ? "text-[#4CC4E4]" : "hover:text-gray-800",
        "active:scale-90 active:opacity-70"
      )}
    >
      <div className="transform transition-transform active:scale-75 duration-150">
        {icon}
      </div>
      <span className="text-xs mt-1 transition-all duration-200">{label}</span>
      {children}
    </Link>
  );
};

const NavbarCenterButton = ({ label }: { label: string }) => {
  return (
    <Link to="/chat" className="relative z-10 active:scale-90 transition-transform duration-150">
      <Button className="bg-[#4CC4E4] hover:bg-[#37b3d4] text-white p-4 h-14 w-14 rounded-xl transform transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#37b3d4] focus:ring-opacity-50 shadow-lg flex flex-col items-center active:bg-[#259db9] active:shadow-inner">
        <div className="transform transition-transform active:scale-75 duration-150">
          <MessageCircle size={26} strokeWidth={2} className="text-white" />
        </div>
        <span className="text-xs mt-1">{label}</span>
      </Button>
    </Link>
  );
};

export default NavBar;
