import { useState, useEffect, useCallback } from 'react';
import echo from '@/lib/echo'; // Наш настроенный Echo
import { useAuth } from '@/contexts/AuthContext';

interface OnlineUser {
  id: number;
  name: string;
  avatar_url?: string | null;
  // Можно добавить другие поля, если они передаются через канал
}

export const useOnlineStatus = () => {
  const { isAuthenticated, user: currentUser } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Map<number, OnlineUser>>(new Map());
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleUserJoined = useCallback((userData: OnlineUser) => {
    setOnlineUsers(prev => new Map(prev).set(userData.id, userData));
  }, []);

  const handleUserLeft = useCallback((userData: OnlineUser) => {
    setOnlineUsers(prev => {
      const newMap = new Map(prev);
      newMap.delete(userData.id);
      return newMap;
    });
     // Здесь можно было бы обновить last_seen_at для этого пользователя, если бы мы получали его
     // Но так как Echo presence channel не дает эту инфу при уходе, 
     // полагаемся на last_seen_at, обновляемый через API middleware
  }, []);

  const handleInitialUsers = useCallback((usersData: OnlineUser[]) => {
    const usersMap = new Map<number, OnlineUser>();
    usersData.forEach(u => usersMap.set(u.id, u));
    setOnlineUsers(usersMap);
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser && echo && !isSubscribed) {
      const channelName = 'online-status';
      try {
        const presenceChannel = echo.join(channelName)
          .here(handleInitialUsers)
          .joining(handleUserJoined)
          .leaving(handleUserLeft)
          .error((error: any) => {
            console.error(`Error subscribing to Echo presence channel ${channelName}:`, error);
            setIsSubscribed(false); // Попробовать переподписаться или обработать ошибку
          });
        
        console.log(`Attempting to join Echo presence channel: ${channelName}`);
        setIsSubscribed(true); // Помечаем, что подписка инициирована

        // Проверка статуса подписки через некоторое время, т.к. .subscribed() не всегда срабатывает как ожидается для join()
        setTimeout(() => {
            if (presenceChannel && presenceChannel.subscription && presenceChannel.subscription.subscribed) {
                 console.log(`Successfully joined Echo presence channel: ${channelName}`);
            } else {
                console.warn(`Failed to confirm subscription to Echo presence channel: ${channelName}. Check server logs and Echo setup.`);
                // setIsSubscribed(false); // Можно сбросить, если хотим разрешить повторную попытку
            }
        }, 5000); // 5 секунд на проверку

        return () => {
          console.log(`Leaving Echo presence channel: ${channelName}`);
          echo.leave(channelName);
          setIsSubscribed(false);
          setOnlineUsers(new Map()); // Очищаем при выходе
        };

      } catch (e) {
        console.error("Failed to join presence channel:", e);
        setIsSubscribed(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser, isSubscribed]); // Добавляем isSubscribed для предотвращения многократных подписок

  const isUserOnline = useCallback((userId: number): boolean => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return { onlineUsers, isUserOnline };
}; 