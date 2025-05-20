import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import NavBar from "@/components/NavBar";
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { updateUserProfile } from '@/services/apiService';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

// Функция для нормализации url (можно вынести в utils)
const getAvatarUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `/storage/avatars/${url.replace(/^.*[\\/]/, '')}`;
};

const UserProfilePage = () => {
  const { user, isLoading, fetchUser } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm({
    defaultValues: {
      name: user?.name || '',
      username: user?.username || '',
      email: user?.email || '',
      gender: user?.gender || 'other',
      city: user?.city || '',
      age: user?.age || '',
      bio: user?.bio || '',
      interests: user?.interests || [],
      password: '',
      password_confirmation: '',
    },
  });

  // Сброс формы при открытии
  const handleEditOpen = () => {
    form.reset({
      name: user?.name || '',
      username: user?.username || '',
      email: user?.email || '',
      gender: user?.gender || 'other',
      city: user?.city || '',
      age: user?.age || '',
      bio: user?.bio || '',
      interests: user?.interests || [],
      password: '',
      password_confirmation: '',
    });
    setEditOpen(true);
  };

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      await updateUserProfile({
        ...data,
        age: data.age ? Number(data.age) : null,
        interests: Array.isArray(data.interests) ? data.interests : [],
      });
      setEditOpen(false);
      await fetchUser();
    } catch (e) {
      // TODO: показать ошибку
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Загрузка...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-white">Пользователь не найден</div>;
  }

  // interests, bio, avatar_url, city, age, created_at, Premium, username
  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-20">
      {/* Верхняя секция с аватаром и основной информацией */}
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">Профиль</h1>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-rulet-purple text-rulet-purple" onClick={handleEditOpen}>
                Редактировать
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Редактировать профиль</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[80vh] pr-2">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField name="name" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Имя</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="username" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="email" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="gender" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пол</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Мужской</SelectItem>
                              <SelectItem value="female">Женский</SelectItem>
                              <SelectItem value="other">Другое</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="city" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Город</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="age" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Возраст</FormLabel>
                        <FormControl><Input type="number" min={1} max={120} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="bio" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>О себе</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {/* Интересы: простое поле через запятую, позже можно сделать теги */}
                    <FormField name="interests" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Интересы (через запятую)</FormLabel>
                        <FormControl>
                          <Input
                            value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                            onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {/* Смена пароля */}
                    <FormField name="password" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Новый пароль</FormLabel>
                        <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="password_confirmation" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>Подтверждение пароля</FormLabel>
                        <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="submit" disabled={saving} className="w-full">Сохранить</Button>
                      <DialogClose asChild>
                        <Button type="button" variant="ghost" className="w-full">Отмена</Button>
                      </DialogClose>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-col items-center">
          <Avatar className="w-32 h-32 border-4 border-violet-500 shadow-lg">
            <AvatarImage src={getAvatarUrl(user.avatar_url)} alt={user.name} />
            <AvatarFallback className="text-4xl bg-violet-900">{user.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold mb-1">{user.name}</h2>
          {user.username && <p className="text-gray-400 mb-2">@{user.username}</p>}
          {user.subscription_status === 'active' && (
            <Badge className="bg-yellow-500/80 text-black mb-3">Premium</Badge>
          )}
          {user.bio && <p className="text-center text-gray-300 max-w-xs mb-6">{user.bio}</p>}
        </div>
      </div>
      {/* Информация о пользователе */}
      <div className="px-4 space-y-4">
        <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Личная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.city && (
              <div className="flex justify-between">
                <span className="text-gray-400">Локация:</span>
                <span>{user.city}</span>
              </div>
            )}
            {user.age && (
              <div className="flex justify-between">
                <span className="text-gray-400">Возраст:</span>
                <span>{user.age}</span>
              </div>
            )}
            {user.created_at && (
              <div className="flex justify-between">
                <span className="text-gray-400">Дата регистрации:</span>
                <span>{format(new Date(user.created_at), 'dd.MM.yyyy')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Email:</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Пол:</span>
              <span>{user.gender}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Интересы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(user.interests) && user.interests.length > 0 ? (
                user.interests.map((interest: string, index: number) => (
                  <HoverCard key={index}>
                    <HoverCardTrigger asChild>
                      <Badge className="bg-rulet-purple/30 hover:bg-rulet-purple cursor-pointer">
                        {interest}
                      </Badge>
                    </HoverCardTrigger>
                    <HoverCardContent className="bg-black/90 border-rulet-purple/30 text-white">
                      Найти людей с интересом: {interest}
                    </HoverCardContent>
                  </HoverCard>
                ))
              ) : (
                <span className="text-gray-400">Нет интересов</span>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Статистика — пока статично, позже интегрировать */}
        <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Статистика</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Звонки:</span>
              <span>—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Друзья:</span>
              <span>—</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Время в приложении:</span>
              <span>—</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <NavBar isPremium={user.subscription_status === 'active'} />
    </div>
  );
};

export default UserProfilePage;
