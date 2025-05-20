import React, { useState, useEffect, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import NavBar from "@/components/NavBar";
import { Users, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { getFriends, getPendingFriendRequests, acceptFriendRequest, rejectOrRemoveFriend, searchUsers } from '@/services/apiService';
import { useToast } from "@/components/ui/use-toast";
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

// Типы для данных с бэкенда
interface UserProfile {
  id: number;
  name: string;
  username?: string; // Предполагаем, что username может быть (если есть на бэке)
  email: string;
  avatar_url: string | null;
  isOnline?: boolean; // Для отображения статуса, если будем его получать
  lastSeen?: string; // Аналогично
  // Другие поля User, которые возвращает бэкэнд
}

interface FriendRequest {
  id: number; // ID записи Friendship
  user_id: number; // ID отправителя
  friend_id: number; // ID получателя (текущего пользователя)
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
  user: UserProfile; // Информация об отправителе запроса
}

const FriendsPage = () => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { isUserOnline, onlineUsers } = useOnlineStatus();

  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [pendingRequestsList, setPendingRequestsList] = useState<FriendRequest[]>([]);
  
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  
  const [errorFriends, setErrorFriends] = useState<string | null>(null);
  const [errorRequests, setErrorRequests] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchFriends = async () => {
    setIsLoadingFriends(true);
    setErrorFriends(null);
    try {
      const response = await getFriends();
      const friendsWithOnlineStatus = response.data.map((friend: UserProfile) => ({
        ...friend,
        isOnline: isUserOnline(friend.id),
      }));
      setFriendsList(friendsWithOnlineStatus);
    } catch (error) {
      console.error("Error fetching friends:", error);
      setErrorFriends("Не удалось загрузить список друзей.");
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось загрузить список друзей." });
    } finally {
      setIsLoadingFriends(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && friendsList.length > 0) {
        const updatedFriends = friendsList.map(friend => ({
            ...friend,
            isOnline: isUserOnline(friend.id)
        }));
        setFriendsList(updatedFriends);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineUsers, isAuthenticated]);

  const fetchPendingRequests = async () => {
    setIsLoadingRequests(true);
    setErrorRequests(null);
    try {
      const response = await getPendingFriendRequests();
      setPendingRequestsList(response.data);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      setErrorRequests("Не удалось загрузить запросы в друзья.");
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось загрузить запросы в друзья." });
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFriends();
      fetchPendingRequests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleAcceptRequest = async (friendshipId: number) => {
    try {
      await acceptFriendRequest(friendshipId);
      toast({ title: "Успех", description: "Запрос в друзья принят." });
      fetchPendingRequests(); // Обновить список запросов
      fetchFriends(); // Обновить список друзей
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось принять запрос." });
    }
  };

  const handleRejectRequest = async (friendshipId: number, friendUserIdToReject: number) => {
    // Для отклонения запроса, который ЕЩЕ НЕ принят, мы удаляем запись Friendship.
    // ID этой записи Friendship - это friendshipId.
    // Однако наш бэкенд rejectOrRemoveFriend ожидает ID пользователя, с которым разрывается связь.
    // В случае запроса, friendship.user.id - это тот, кто отправил запрос.
    // friendship.friend_id - это текущий пользователь.
    // Мы должны удалить запись о дружбе.
    // Так как rejectOrRemoveFriend работает с User ID, нам нужно передать ID пользователя,
    // который отправил запрос (это user.id из объекта запроса, или friendship.user_id из данных запроса)
    try {
      await rejectOrRemoveFriend(friendUserIdToReject); // Передаем ID пользователя, чей запрос отклоняем
      toast({ title: "Успех", description: "Запрос в друзья отклонен." });
      fetchPendingRequests(); // Обновить список запросов
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось отклонить запрос." });
    }
  };
  
  const handleRemoveFriend = async (friendUserId: number) => {
    try {
      await rejectOrRemoveFriend(friendUserId);
      toast({ title: "Успех", description: "Пользователь удален из друзей." });
      fetchFriends(); // Обновить список друзей
    } catch (error) {
      console.error("Error removing friend:", error);
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось удалить друга." });
    }
  };
  
  const handleSearchUsers = async (term: string) => {
    if (term.trim().length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setIsSearchingUsers(true);
    setSearchError(null);
    try {
      const response = await searchUsers(term);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchError("Ошибка при поиске пользователей.");
      setSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleSendFriendRequest = async (recipientId: number) => {
    try {
      await sendFriendRequest(recipientId);
      toast({ title: "Успех", description: "Запрос в друзья отправлен." });
      // Можно обновить UI, чтобы показать, что запрос отправлен, или закрыть модалку
      setIsAddFriendModalOpen(false);
      // Возможно, стоит обновить pendingRequests, если бэк отдает и исходящие (но наш - нет)
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      const errorMessage = error.response?.data?.message || "Не удалось отправить запрос.";
      toast({ variant: "destructive", title: "Ошибка", description: errorMessage });
    }
  };

  // Фильтрация для вкладок
  const onlineFriendsList = useMemo(() => friendsList.filter(friend => friend.isOnline), [friendsList]);

  const filteredFriends = useMemo(() => friendsList.filter(friend => 
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (friend.username && friend.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [friendsList, searchTerm]);

  const filteredOnlineFriends = useMemo(() => onlineFriendsList.filter(friend => 
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (friend.username && friend.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [onlineFriendsList, searchTerm]);
  
  const filteredPendingRequests = useMemo(() => pendingRequestsList.filter(request => 
    request.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (request.user.username && request.user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    request.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [pendingRequestsList, searchTerm]);

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-rulet-dark text-white flex items-center justify-center"><p>Пожалуйста, войдите, чтобы просматривать друзей.</p></div>;
  }
  
  // Демо-данные для списка друзей (ЗАКОММЕНТИРОВАНО)
  // const friends = [ /* ... */ ];
  // const friendRequests = [ /* ... */ ];
  
  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-20">
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="text-rulet-purple" />
            <h1 className="text-xl font-bold">Друзья</h1>
          </div>
          <Button 
            variant="outline" 
            className="border-rulet-purple text-rulet-purple flex items-center gap-2"
            onClick={() => setIsAddFriendModalOpen(true)}
          >
            <UserPlus className="w-5 h-5" />
            Добавить друга
          </Button>
        </div>
        
        <Input 
          placeholder="Поиск друзей..." 
          className="mb-4 bg-black/40 border-rulet-purple/30 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="bg-black/40 text-gray-400 border-b border-rulet-purple/20 rounded-none w-full mb-4 gap-8">
            <TabsTrigger value="friends" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              Все друзья
            </TabsTrigger>
            <TabsTrigger value="online" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              Онлайн
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              Запросы
              {pendingRequestsList.length > 0 && <Badge className="ml-2 bg-rulet-purple">{pendingRequestsList.length}</Badge>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends" className="space-y-3">
            {isLoadingFriends && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-rulet-purple" />
                <p className="ml-2 text-gray-400">Загрузка друзей...</p>
              </div>
            )}
            {errorFriends && !isLoadingFriends && (
              <div className="flex flex-col items-center justify-center py-10 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{errorFriends}</p>
                <Button onClick={fetchFriends} className="mt-4 bg-rulet-purple hover:bg-rulet-purple-dark">Попробовать снова</Button>
              </div>
            )}
            {!isLoadingFriends && !errorFriends && filteredFriends.length === 0 && (
              <p className="text-center text-gray-400 py-10">Список друзей пуст.</p>
            )}
            {!isLoadingFriends && !errorFriends && filteredFriends.map(friend => (
              <Card key={friend.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border border-rulet-purple/30">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        {friend.isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-black" title="Онлайн"></span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{friend.name}</h3>
                        <p className="text-sm text-gray-400">@{friend.username || friend.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs ${friend.isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                        {friend.isOnline ? 'Онлайн' : (friend.lastSeen || 'Офлайн')}
                      </span>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" className="h-8 px-3 border-rulet-purple/50 text-rulet-purple">
                          Видеочат
                        </Button>
                         <Button size="sm" variant="destructive" className="h-8 px-3" onClick={() => handleRemoveFriend(friend.id)}>
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="online" className="space-y-3">
            {isLoadingFriends && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-rulet-purple" />
                <p className="ml-2 text-gray-400">Загрузка...</p>
              </div>
            )}
            {errorFriends && !isLoadingFriends && (
              <div className="flex flex-col items-center justify-center py-10 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{errorFriends}</p>
              </div>
            )}
            {!isLoadingFriends && !errorFriends && filteredOnlineFriends.length === 0 && (
                 <p className="text-center text-gray-400 py-10">Нет друзей онлайн.</p>
            )}
            {!isLoadingFriends && !errorFriends && filteredOnlineFriends.map(friend => (
              <Card key={friend.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border border-rulet-purple/30">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-black" title="Онлайн"></span>
                      </div>
                      <div>
                        <h3 className="font-medium">{friend.name}</h3>
                        <p className="text-sm text-gray-400">@{friend.username || friend.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-green-500">Онлайн</span>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" className="h-8 px-3 border-rulet-purple/50 text-rulet-purple">
                          Видеочат
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 px-3" onClick={() => handleRemoveFriend(friend.id)}>
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="requests" className="space-y-3">
            {isLoadingRequests && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-rulet-purple" />
                <p className="ml-2 text-gray-400">Загрузка запросов...</p>
              </div>
            )}
            {errorRequests && !isLoadingRequests && (
              <div className="flex flex-col items-center justify-center py-10 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{errorRequests}</p>
                 <Button onClick={fetchPendingRequests} className="mt-4 bg-rulet-purple hover:bg-rulet-purple-dark">Попробовать снова</Button>
              </div>
            )}
            {!isLoadingRequests && !errorRequests && filteredPendingRequests.length === 0 && (
              <p className="text-center text-gray-400 py-10">Нет входящих запросов в друзья.</p>
            )}
            {!isLoadingRequests && !errorRequests && filteredPendingRequests.map(request => (
              <Card key={request.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-rulet-purple/30">
                        <AvatarImage src={request.user.avatar_url || undefined} />
                        <AvatarFallback>{request.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{request.user.name}</h3>
                        <p className="text-sm text-gray-400">@{request.user.username || request.user.email}</p>
                        {/* Можно добавить доп. инфо, если есть, например, общие друзья */}
                        {/* <p className="text-xs text-gray-500">{request.mutualFriends} общих друзей</p> */}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="bg-rulet-purple hover:bg-rulet-purple/80"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        Принять
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-gray-700 text-gray-300 hover:bg-gray-700"
                        onClick={() => handleRejectRequest(request.id, request.user.id)}
                      >
                        Отклонить
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Модальное окно для добавления друзей */}
      {isAddFriendModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-rulet-dark-light border-rulet-purple/50">
            <CardHeader>
              <CardTitle className="text-white">Добавить друга</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Введите имя или email пользователя..."
                className="bg-black/40 border-rulet-purple/30 text-white"
                onChange={(e) => handleSearchUsers(e.target.value)}
              />
              {isSearchingUsers && (
                <div className="flex justify-center items-center py-3">
                  <Loader2 className="h-6 w-6 animate-spin text-rulet-purple" />
                  <p className="ml-2 text-gray-400">Поиск...</p>
                </div>
              )}
              {searchError && !isSearchingUsers &&(
                 <p className="text-red-500 text-sm text-center">{searchError}</p>
              )}
              {!isSearchingUsers && searchResults.length === 0 && !searchError && (
                 <p className="text-gray-400 text-sm text-center">Начните вводить имя или email для поиска.</p>
              )}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.map(foundUser => (
                  <div key={foundUser.id} className="flex items-center justify-between p-2 bg-black/20 rounded">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={foundUser.avatar_url || undefined} />
                        <AvatarFallback>{foundUser.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white">{foundUser.name}</p>
                        <p className="text-xs text-gray-400">{foundUser.email}</p>
                      </div>
                    </div>
                    {/* Тут нужна проверка, не является ли пользователь уже другом или запрос уже отправлен */}
                    <Button 
                      size="sm" 
                      className="bg-rulet-purple hover:bg-rulet-purple-dark"
                      onClick={() => handleSendFriendRequest(foundUser.id)}
                    >
                      Добавить
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 flex justify-end">
                 <Button variant="outline" onClick={() => setIsAddFriendModalOpen(false)} className="border-gray-600 text-gray-300">
                    Закрыть
                 </Button>
            </div>
          </Card>
        </div>
      )}

      <NavBar isPremium={currentUser?.subscription_status === 'active'} />
    </div>
  );
};

export default FriendsPage;
