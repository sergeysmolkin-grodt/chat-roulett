import React, { useState, useRef } from 'react';
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
import { updateUserProfile, uploadAvatar } from '@/services/apiService';
import { useForm } from 'react-hook-form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from 'react-i18next';

const getAvatarUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `http://localhost:8081${url}`;
};

const UserProfilePage = () => {
  const { user, isLoading, fetchUser } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();
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
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDeleteAvatar = async () => {
    setAvatarMenuOpen(false);
    setSaving(true);
    try {
      // Отправляем uploadAvatar с пустым файлом (или null), если сервер поддерживает, либо доработать API
      await uploadAvatar(new File([], ''));
      await fetchUser();
    } catch (e) {
      // TODO: показать ошибку
    } finally {
      setSaving(false);
    }
  };

  const handleChangeAvatar = () => {
    setAvatarMenuOpen(false);
    setTimeout(() => fileInputRef.current?.click(), 100); // Даем Popover закрыться
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input changed', e.target.files);
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSaving(true);
    try {
      await uploadAvatar(file);
      await fetchUser();
    } catch (e) {
      // TODO: показать ошибку
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">{t('profilePage.loading')}</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-white">{t('profilePage.notFound')}</div>;
  }

  // interests, bio, avatar_url, city, age, created_at, Premium, username
  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-20">
      {/* Верхняя секция с аватаром и основной информацией */}
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">{t('profilePage.title')}</h1>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-rulet-purple text-rulet-purple" onClick={handleEditOpen}>
                {t('profilePage.editButton')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('profilePage.editTitle')}</DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[80vh] pr-2">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField name="name" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.name')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="username" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.username')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="email" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.email')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="gender" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.gender')}</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">{t('profilePage.genderOptions.male')}</SelectItem>
                              <SelectItem value="female">{t('profilePage.genderOptions.female')}</SelectItem>
                              <SelectItem value="other">{t('profilePage.genderOptions.other')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="city" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.city')}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="age" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.age')}</FormLabel>
                        <FormControl><Input type="number" min={1} max={120} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="bio" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.bio')}</FormLabel>
                        <FormControl><Textarea {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="interests" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.interests')}</FormLabel>
                        <FormControl>
                          <Input
                            value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                            onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            placeholder={t('profilePage.interestsPlaceholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="password" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.newPassword')}</FormLabel>
                        <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField name="password_confirmation" control={form.control} render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('profilePage.passwordConfirm')}</FormLabel>
                        <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <DialogFooter>
                      <Button type="submit" disabled={saving} className="w-full">{t('profilePage.saveButton')}</Button>
                      <DialogClose asChild>
                        <Button type="button" variant="ghost" className="w-full">{t('profilePage.cancelButton')}</Button>
                      </DialogClose>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-col items-center">
          <Popover open={avatarMenuOpen} onOpenChange={setAvatarMenuOpen}>
            <PopoverTrigger asChild>
              <Avatar className="w-32 h-32 border-4 border-violet-500 shadow-lg cursor-pointer">
                <AvatarImage src={getAvatarUrl(user.avatar_url) + `?t=${Date.now()}`} alt={user.name} />
                <AvatarFallback className="text-4xl bg-violet-900">{user.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </PopoverTrigger>
            <PopoverContent className="w-48 flex flex-col gap-2">
              <Button variant="ghost" onClick={handleChangeAvatar}>{t('profilePage.changeAvatar')}</Button>
              <Button variant="destructive" onClick={handleDeleteAvatar}>{t('profilePage.deleteAvatar')}</Button>
            </PopoverContent>
          </Popover>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAvatarFileChange} />
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
        {/* Статистика — теперь динамическая */}
        <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">{t('profilePage.statsTitle') || 'Статистика'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('profilePage.stats.calls') || 'Звонки:'}</span>
              <span>{user.total_calls ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('profilePage.stats.friends') || 'Друзья:'}</span>
              <span>{user.total_friends ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('profilePage.stats.firstCall') || 'Дата первого звонка:'}</span>
              <span>{user.first_conversation_at ? format(new Date(user.first_conversation_at), 'dd.MM.yyyy HH:mm') : '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <NavBar />
    </div>
  );
};

export default UserProfilePage;
