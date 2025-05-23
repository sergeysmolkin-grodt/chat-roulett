import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import NavBar from "@/components/NavBar";
import { Users, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { getFriends, getPendingFriendRequests, acceptFriendRequest, rejectOrRemoveFriend, searchUsers, sendFriendRequest } from '@/services/apiService';
import { useToast } from "@/components/ui/use-toast";
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Типы для данных с бэкенда
interface UserProfile {
  id: number;
  name: string | null;
  username?: string | null;
  email: string;
  avatar_url: string | null;
  last_seen_at: string | null;
  isOnline?: boolean;
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

const formatLastSeen = (lastSeenAt: string | null) => {
  if (!lastSeenAt) return '';
  try {
    return formatDistanceToNow(parseISO(lastSeenAt), { addSuffix: true, locale: undefined });
  } catch {
    return '';
  }
};

const getAvatarUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:8081${url}`;
};

// LanguageSwitcher из CategoriesPage
const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const changeLanguage = (lng: string) => i18n.changeLanguage(lng);
  return (
    <div className="flex gap-1 bg-black/40 rounded-full px-2 py-1 shadow-lg">
      <Button 
        variant={i18n.language === 'ru' ? "secondary" : "ghost"} 
        size="sm"
        onClick={() => changeLanguage('ru')} 
        className="text-xs p-1 h-auto"
      >
        RU
      </Button>
      <Button 
        variant={i18n.language === 'en' ? "secondary" : "ghost"} 
        size="sm"
        onClick={() => changeLanguage('en')} 
        className="text-xs p-1 h-auto"
      >
        EN
      </Button>
    </div>
  );
};

const FriendsPage = () => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { isUserOnline, onlineUsers } = useOnlineStatus();
  const { t } = useTranslation();

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
  const [openChatWith, setOpenChatWith] = useState<UserProfile | null>(null);
  const [chatPosition, setChatPosition] = useState<{ x: number; y: number }>({ x: 24, y: window.innerHeight - 440 });
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const dragData = useRef<{
    startMouseX: number;
    startMouseY: number;
    startPopupX: number;
    startPopupY: number;
    dragging: boolean;
  }>({ startMouseX: 0, startMouseY: 0, startPopupX: 0, startPopupY: 0, dragging: false });

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
      setErrorFriends(t('friendsPage.error'));
      toast({ variant: "destructive", title: t('friendsPage.error'), description: t('friendsPage.error') });
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
      setErrorRequests(t('friendsPage.error'));
      toast({ variant: "destructive", title: t('friendsPage.error'), description: t('friendsPage.error') });
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
      toast({ title: t('friendsPage.actions.acceptSuccess') });
      fetchPendingRequests();
      fetchFriends();
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast({ variant: "destructive", title: t('friendsPage.error'), description: t('friendsPage.actions.acceptError') });
    }
  };

  const handleRejectRequest = async (friendshipId: number, friendUserIdToReject: number) => {
    try {
      await rejectOrRemoveFriend(friendUserIdToReject);
      toast({ title: t('friendsPage.actions.rejectSuccess') });
      fetchPendingRequests();
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast({ variant: "destructive", title: t('friendsPage.error'), description: t('friendsPage.actions.rejectError') });
    }
  };
  
  const handleRemoveFriend = async (friendUserId: number) => {
    try {
      await rejectOrRemoveFriend(friendUserId);
      toast({ title: t('friendsPage.actions.removeSuccess') });
      fetchFriends();
    } catch (error) {
      console.error("Error removing friend:", error);
      toast({ variant: "destructive", title: t('friendsPage.error'), description: t('friendsPage.actions.removeError') });
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
      setSearchError(t('friendsPage.error'));
      setSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleSendFriendRequest = async (recipientId: number) => {
    try {
      await sendFriendRequest(recipientId);
      toast({ title: t('friendsPage.actions.sendSuccess') });
      setIsAddFriendModalOpen(false);
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      const errorMessage = error.response?.data?.message || t('friendsPage.actions.sendError');
      toast({ variant: "destructive", title: t('friendsPage.error'), description: errorMessage });
    }
  };

  // Фильтрация для вкладок
  const onlineFriendsList = useMemo(() => friendsList.filter(friend => friend.isOnline), [friendsList]);

  const filteredFriends = useMemo(() => friendsList.filter(friend => 
    friend.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (friend.username && friend.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [friendsList, searchTerm]);

  const filteredOnlineFriends = useMemo(() => onlineFriendsList.filter(friend => 
    friend.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (friend.username && friend.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [onlineFriendsList, searchTerm]);
  
  const filteredPendingRequests = useMemo(() => pendingRequestsList.filter(request => 
    request.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (request.user.username && request.user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    request.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ), [pendingRequestsList, searchTerm]);

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    if (!chatBoxRef.current) return;
    dragData.current.dragging = true;
    dragData.current.startMouseX = e.clientX;
    dragData.current.startMouseY = e.clientY;
    dragData.current.startPopupX = chatPosition.x;
    dragData.current.startPopupY = chatPosition.y;
    document.body.style.userSelect = 'none';
  };
  const handleDrag = (e: MouseEvent) => {
    if (!dragData.current.dragging) return;
    let newX = dragData.current.startPopupX + (e.clientX - dragData.current.startMouseX);
    let newY = dragData.current.startPopupY + (e.clientY - dragData.current.startMouseY);
    // Ограничения по границам окна
    const box = chatBoxRef.current;
    const width = box?.offsetWidth || 400;
    const height = box?.offsetHeight || 400;
    newX = Math.max(0, Math.min(window.innerWidth - width, newX));
    newY = Math.max(0, Math.min(window.innerHeight - height, newY));
    setChatPosition({ x: newX, y: newY });
  };
  const handleDragEnd = () => {
    dragData.current.dragging = false;
    document.body.style.userSelect = '';
  };
  useEffect(() => {
    if (!openChatWith) return;
    const onMove = (e: MouseEvent) => handleDrag(e);
    const onUp = () => handleDragEnd();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [openChatWith]);

  useEffect(() => {
    document.title = 'YNYIETY';
  }, []);

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-rulet-dark text-white flex items-center justify-center"><p>{t('friendsPage.error')}</p></div>;
  }
  
  // Демо-данные для списка друзей (ЗАКОММЕНТИРОВАНО)
  // const friends = [ /* ... */ ];
  // const friendRequests = [ /* ... */ ];
  
  return (
    <div className="min-h-screen text-white pb-20">
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="text-rulet-purple" />
            <h1 className="text-xl font-bold">{t('friendsPage.title')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {/* Аватар пользователя слева от кнопки */}
            <a
              href="/profile"
              className="group flex flex-col items-center justify-center"
            >
              <Avatar className="w-10 h-10 border-2 border-rulet-purple">
                <AvatarImage src={getAvatarUrl(currentUser?.avatar_url)} alt={currentUser?.name || ''} />
                <AvatarFallback className="bg-rulet-purple text-white text-xl">{currentUser?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="text-xs text-black text-center mt-1 break-words whitespace-normal">
                @{currentUser?.username || currentUser?.email || currentUser?.name}
              </div>
            </a>
            <Dialog open={isAddFriendModalOpen} onOpenChange={setIsAddFriendModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-rulet-purple hover:bg-rulet-purple-dark">
                  <UserPlus className="mr-2 h-5 w-5" />
                  {t('friendsPage.addFriend')}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-md bg-rulet-dark-light border-rulet-purple/50">
                <DialogHeader>
                  <DialogTitle className="text-white">Добавить друга</DialogTitle>
                </DialogHeader>
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
                            <AvatarFallback>{foundUser.name?.[0] || ''}</AvatarFallback>
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
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <Input 
          placeholder={t('friendsPage.searchPlaceholder')} 
          className="mb-4 bg-black/40 border-rulet-purple/30 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="bg-black/20 text-gray-400 border-b border-rulet-purple/20 rounded-none w-full mb-4 gap-8">
            <TabsTrigger value="friends" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              {t('friendsPage.title')}
            </TabsTrigger>
            <TabsTrigger value="online" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              {t('friendsPage.online')}
            </TabsTrigger>
            <TabsTrigger value="requests" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              {t('friendsPage.pendingRequests')}
              {pendingRequestsList.length > 0 && <Badge className="ml-2 bg-rulet-purple">{pendingRequestsList.length}</Badge>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends" className="space-y-3">
            {isLoadingFriends && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-rulet-purple" />
                <p className="ml-2 text-gray-400">{t('friendsPage.loadingFriends', 'Loading friends...')}</p>
              </div>
            )}
            {errorFriends && !isLoadingFriends && (
              <div className="flex flex-col items-center justify-center py-10 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{errorFriends}</p>
                <Button onClick={fetchFriends} className="mt-4 bg-rulet-purple hover:bg-rulet-purple-dark">{t('friendsPage.retry', 'Try again')}</Button>
              </div>
            )}
            {!isLoadingFriends && !errorFriends && filteredFriends.length === 0 && (
              <p className="text-center text-gray-400 py-10">{t('friendsPage.noFriends')}</p>
            )}
            {!isLoadingFriends && !errorFriends && filteredFriends.map(friend => (
              <Card key={friend.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex flex-col items-center">
                        <Avatar className="h-12 w-12 border border-rulet-purple/30">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback>{friend.name?.[0] || ''}</AvatarFallback>
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
                        {friend.isOnline ? t('friendsPage.online') : (friend.last_seen_at ? `${t('friendsPage.lastSeen')} ${formatLastSeen(friend.last_seen_at)}` : t('friendsPage.offline'))}
                      </span>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" className="h-8 px-3 border-rulet-purple/50 text-rulet-purple">
                          {t('friendsPage.videoChat', 'Video Chat')}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-3 border-rulet-purple/50 text-rulet-purple" onClick={() => setOpenChatWith(friend)}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75m19.5 0v.243a2.25 2.25 0 01-.659 1.591l-7.591 7.591a2.25 2.25 0 01-3.182 0l-7.591-7.591A2.25 2.25 0 012.25 6.993V6.75" />
                          </svg>
                          {t('friendsPage.textChat', 'Чат')}
                        </Button>
                         <Button size="sm" variant="destructive" className="h-8 px-3" onClick={() => handleRemoveFriend(friend.id)}>
                          {t('friendsPage.remove')}
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
                <p className="ml-2 text-gray-400">{t('friendsPage.loadingFriends', 'Loading friends...')}</p>
              </div>
            )}
            {errorFriends && !isLoadingFriends && (
              <div className="flex flex-col items-center justify-center py-10 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{errorFriends}</p>
              </div>
            )}
            {!isLoadingFriends && !errorFriends && filteredOnlineFriends.length === 0 && (
                 <p className="text-center text-gray-400 py-10">{t('friendsPage.noFriendsOnline')}</p>
            )}
            {!isLoadingFriends && !errorFriends && filteredOnlineFriends.map(friend => (
              <Card key={friend.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex flex-col items-center">
                        <Avatar className="h-12 w-12 border border-rulet-purple/30">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback>{friend.name?.[0] || ''}</AvatarFallback>
                        </Avatar>
                        {/* Никнейм под аватаром */}
                        <div className="text-xs text-gray-400 text-center mt-1 break-words whitespace-normal max-w-[80px]">
                          @{friend.username || friend.email || friend.name}
                        </div>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-black" title="Онлайн"></span>
                      </div>
                      <div>
                        <h3 className="font-medium">{friend.name}</h3>
                        <p className="text-sm text-gray-400">@{friend.username || friend.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-green-500">{t('friendsPage.online')}</span>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" className="h-8 px-3 border-rulet-purple/50 text-rulet-purple">
                          {t('friendsPage.videoChat', 'Video Chat')}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 px-3 border-rulet-purple/50 text-rulet-purple" onClick={() => setOpenChatWith(friend)}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75m19.5 0v.243a2.25 2.25 0 01-.659 1.591l-7.591 7.591a2.25 2.25 0 01-3.182 0l-7.591-7.591A2.25 2.25 0 012.25 6.993V6.75" />
                          </svg>
                          {t('friendsPage.textChat', 'Чат')}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 px-3" onClick={() => handleRemoveFriend(friend.id)}>
                          {t('friendsPage.remove')}
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
                <p className="ml-2 text-gray-400">{t('friendsPage.loadingRequests', 'Loading requests...')}</p>
              </div>
            )}
            {errorRequests && !isLoadingRequests && (
              <div className="flex flex-col items-center justify-center py-10 text-red-500">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>{errorRequests}</p>
                 <Button onClick={fetchPendingRequests} className="mt-4 bg-rulet-purple hover:bg-rulet-purple-dark">{t('friendsPage.retry', 'Try again')}</Button>
              </div>
            )}
            {!isLoadingRequests && !errorRequests && filteredPendingRequests.length === 0 && (
              <p className="text-center text-gray-400 py-10">{t('friendsPage.noRequests')}</p>
            )}
            {!isLoadingRequests && !errorRequests && filteredPendingRequests.map(request => (
              <Card key={request.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-rulet-purple/30">
                        <AvatarImage src={request.user.avatar_url || undefined} />
                        <AvatarFallback>{request.user.name?.[0] || ''}</AvatarFallback>
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
                        {t('friendsPage.accept', 'Accept')}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-gray-700 text-gray-300 hover:bg-gray-700"
                        onClick={() => handleRejectRequest(request.id, request.user.id)}
                      >
                        {t('friendsPage.reject', 'Reject')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Popup ChatBox — draggable */}
      {openChatWith && (
        <div
          ref={chatBoxRef}
          style={{
            position: 'fixed',
            left: chatPosition.x,
            top: chatPosition.y,
            width: 384, // w-96
            maxWidth: '100%',
            zIndex: 9999,
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid rgba(128,90,213,0.4)',
            borderRadius: '1rem',
            boxShadow: '0 10px 40px 0 rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fade-in 0.2s',
            transition: 'left 0.15s cubic-bezier(.4,2,.6,1), top 0.15s cubic-bezier(.4,2,.6,1)',
            pointerEvents: 'auto',
            userSelect: dragData.current.dragging ? 'none' : 'auto',
          }}
          className="shadow-2xl animate-fade-in"
        >
          {/* Header — drag handle */}
          <div
            className="flex items-center gap-3 p-3 border-b border-rulet-purple/30 bg-black/70 rounded-t-xl cursor-move select-none"
            onMouseDown={handleDragStart}
            style={{ cursor: 'move', userSelect: 'none' }}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-rulet-purple/40">
              {openChatWith.avatar_url ? (
                <img src={getAvatarUrl(openChatWith.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-rulet-purple text-white font-bold text-lg">{openChatWith.name?.[0] || '?'}</div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-white font-semibold">{openChatWith.name || openChatWith.username || openChatWith.email}</div>
              <div className="text-xs text-gray-400">@{openChatWith.username || openChatWith.email}</div>
            </div>
            <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white" onClick={() => setOpenChatWith(null)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          {/* ChatBox UI (локальный state сообщений) */}
          
        </div>
      )}

      <NavBar />
    </div>
  );
};

export default FriendsPage;
