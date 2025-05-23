import { useLocation } from 'react-router-dom';

const backgrounds: Record<string, string> = {
  '/chat': '/backgrounds/chat.jpg',
  '/welcome': '/backgrounds/welcome.jpg',
  '/premium': '/backgrounds/premium.jpg',
  '/friends': '/backgrounds/friends.jpg',
  '/categories': '/backgrounds/categories.jpg',
  // Добавляй другие пути и картинки по необходимости
};

export default function BackgroundSwitcher() {
  const location = useLocation();
  let bg = backgrounds[location.pathname];

  // Для динамических роутов профиля
  if (!bg && location.pathname.startsWith('/profile')) {
    bg = '/backgrounds/profile.jpg';
  }
  // Для динамических роутов shop
  if (!bg && location.pathname.startsWith('/shop')) {
    bg = '/backgrounds/shop.jpg';
  }

  if (!bg) return null;

  return (
    <div
      className="fixed inset-0 w-full h-full -z-10"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
} 