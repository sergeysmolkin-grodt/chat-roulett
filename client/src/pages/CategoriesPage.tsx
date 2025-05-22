import React, { useEffect, useState } from 'react';
import * as apiService from '@/services/apiService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import App from '../App';

interface CategoryUser {
  id: number;
  name: string | null;
  username?: string | null;
  email?: string | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
  user: CategoryUser; // Информация о создателе
  // active_users_count?: number; // Для будущего расширения
}

const getAvatarUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:8081${url}`;
};

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

const CategoriesPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  const [selectedRoom, setSelectedRoom] = useState<Category | null>(null);
  const [roomUsers, setRoomUsers] = useState<any[]>([]); // UserProfile[]

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        variant: "destructive",
        title: t('roomsPage.loadErrorTitle'),
        description: t('roomsPage.loadErrorDesc'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast({
        variant: "destructive",
        title: t('roomsPage.validationError'),
        description: t('roomsPage.validationError'),
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await apiService.createCategory({
        name: newCategoryName,
        description: newCategoryDescription || undefined,
      });
      setCategories(prev => [response.data, ...prev]);
      toast({
        title: t('roomsPage.createSuccessTitle'),
        description: t('roomsPage.createSuccessDesc', { name: response.data.name }),
      });
      setNewCategoryName('');
      setNewCategoryDescription('');
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({
        variant: "destructive",
        title: t('roomsPage.createErrorTitle'),
        description: error.response?.data?.message || t('roomsPage.createErrorDesc'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterRoom = (room: Category) => {
    setSelectedRoom(room);
    // TODO: здесь будет реальный API для получения пользователей комнаты
    setRoomUsers([]); // пока пусто
  };
  const handleLeaveRoom = () => {
    setSelectedRoom(null);
    setRoomUsers([]);
  };
  const handleStartChatWith = (userId: number) => {
    // TODO: инициировать чат с выбранным пользователем
    alert('Начать общение с пользователем ID ' + userId);
  };

  // Добавим обработчик для входа в чат комнаты
  const handleEnterRoomChat = (room: Category) => {
    // TODO: здесь должен быть переход к VideoChat или модалка чата
    alert('Вход в чат комнаты: ' + room.name);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto p-4 text-center text-white">
        <p>{t('roomsPage.notLoggedIn')}</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 text-white relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('roomsPage.title')}</h1>
        <div className="flex items-center gap-4">
          {/* LanguageSwitcher слева от аватара */}
          <LanguageSwitcher />
          {/* Аватар пользователя */}
          <a
            href="/profile"
            className="group flex flex-col items-center justify-center text-center"
            title={user?.username || user?.name || 'Профиль'}
          >
            <div className="w-12 h-12 rounded-full border-2 border-rulet-purple shadow-lg bg-black/60 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform mx-auto">
              {user?.avatar_url ? (
                <img
                  src={getAvatarUrl(user.avatar_url)}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-rulet-purple">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0v.75a.75.75 0 01-.75.75h-13.5a.75.75 0 01-.75-.75v-.75z" />
                </svg>
              )}
            </div>
            <div className="text-xs text-gray-300 text-center mt-1 break-words whitespace-normal">
              @{user?.username || user?.email || user?.name}
            </div>
          </a>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-rulet-purple hover:bg-rulet-purple-dark">
                <PlusCircle className="mr-2 h-5 w-5" /> {t('roomsPage.addRoom')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-rulet-dark text-white border-rulet-chat-outline">
              <DialogHeader>
                <DialogTitle>{t('roomsPage.addRoomDialogTitle')}</DialogTitle>
                <DialogDescription>
                  {t('roomsPage.addRoomDialogDesc')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCategory}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="name" className="text-right">
                      {t('roomsPage.nameLabel')}
                    </label>
                    <Input
                      id="name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="col-span-3 bg-rulet-input border-rulet-chat-outline focus:ring-rulet-purple text-white placeholder:text-gray-400"
                      placeholder={t('roomsPage.namePlaceholder')}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="description" className="text-right">
                      {t('roomsPage.descLabel')}
                    </label>
                    <Textarea
                      id="description"
                      value={newCategoryDescription}
                      onChange={(e) => setNewCategoryDescription(e.target.value)}
                      className="col-span-3 bg-rulet-input border-rulet-chat-outline focus:ring-rulet-purple text-white placeholder:text-gray-400"
                      placeholder={t('roomsPage.descPlaceholder')}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-rulet-purple hover:bg-rulet-purple-dark" disabled={isSubmitting}>
                    {isSubmitting ? t('roomsPage.creatingButton') : t('roomsPage.createButton')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Если выбрана комната — показываем пользователей */}
      {selectedRoom ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-rulet-purple">{selectedRoom.name}</h2>
            <Button variant="outline" className="border-rulet-purple text-rulet-purple" onClick={handleLeaveRoom}>Выйти</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {roomUsers.map(user => (
              <Card key={user.id} className="bg-black/60 border-rulet-purple/30 flex flex-col items-center p-4">
                <div className="w-20 h-20 rounded-full bg-rulet-purple/30 flex items-center justify-center mb-2 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={getAvatarUrl(user.avatar_url)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-white">{user.name[0]}</span>
                  )}
                </div>
                {/* Никнейм под иконкой */}
                <div className="text-xs text-gray-400 mb-1">
                  @{user.username || user.email || user.name}
                </div>
                <div className="font-semibold text-white mb-1">{user.name}</div>
                {/* Здесь можно добавить превью камеры, если есть */}
                <Button className="mt-2 bg-rulet-purple hover:bg-rulet-purple-dark w-full" onClick={() => handleStartChatWith(user.id)}>Общаться</Button>
              </Card>
            ))}
          </div>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
                <Card key={index} className="bg-rulet-chat-bg border-rulet-chat-outline animate-pulse">
                    <CardHeader>
                        <div className="h-6 bg-gray-600 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-700 rounded w-1/2 mt-1"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                    </CardContent>
                    <CardFooter>
                        <div className="h-4 bg-gray-600 rounded w-1/3"></div>
                    </CardFooter>
                </Card>
            ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-center text-gray-400">{t('roomsPage.emptyList')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="bg-rulet-chat-bg border-rulet-chat-outline text-white flex flex-col justify-between hover:shadow-lg hover:shadow-rulet-purple/30 transition-shadow cursor-pointer" onClick={() => handleEnterRoom(category)}>
              <CardHeader>
                <CardTitle className="text-xl text-rulet-purple">{category.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  {t('roomsPage.createdBy')}: {category.user.username || category.user.name || 'Unknown User'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  {category.description || t('roomsPage.noDescription')}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <Button variant="outline" className="border-rulet-purple text-rulet-purple hover:bg-rulet-purple hover:text-white" onClick={e => { e.stopPropagation(); handleEnterRoomChat(category); }}>
                  {t('roomsPage.joinButton')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage; 