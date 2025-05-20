import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import { useAuth } from '@/contexts/AuthContext';
import apiService from '@/services/apiService';
import { Link } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';

const UserSettingsPage = () => {
  const { toast } = useToast();
  const { user, fetchUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(user?.gender || 'male');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name,
        email: user?.email,
        gender,
      };
      if (password) {
        if (password !== passwordConfirm) {
          setError('Пароли не совпадают');
          setSaving(false);
          return;
        }
        payload.password = password;
        payload.password_confirmation = passwordConfirm;
      }
      await apiService.put('/user', payload);
      await fetchUser();
      toast({
        title: "Настройки сохранены",
        description: "Ваши настройки успешно обновлены",
      });
      setPassword('');
      setPasswordConfirm('');
    } catch (err: any) {
      let msg = 'Ошибка при сохранении настроек';
      if (err.response && err.response.data && err.response.data.errors) {
        msg = Object.values(err.response.data.errors).flat().join(' ');
      } else if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      }
      setError(msg);
      toast({
        title: "Ошибка",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setAvatarFile(file);
    setAvatarUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await apiService.post('/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(res.data.avatar_url);
      await fetchUser();
      toast({ title: 'Аватар обновлен', description: 'Ваш аватар успешно загружен.' });
    } catch (err: any) {
      let msg = 'Ошибка при загрузке аватара';
      if (err.response && err.response.data && err.response.data.errors) {
        msg = Object.values(err.response.data.errors).flat().join(' ');
      } else if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      }
      setError(msg);
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Функция для получения абсолютного URL аватара
  const getAvatarUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Если путь относительный (например, /storage/...), добавляем базовый адрес API
    return `http://localhost:8081${url}`;
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-rulet-dark text-white">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-24">
      <Link to="/profile" className="fixed top-6 right-8 z-30">
        <div className="w-12 h-12 rounded-full bg-rulet-purple flex items-center justify-center shadow-lg hover:scale-105 transition-transform border-2 border-rulet-purple/60">
          <UserIcon className="text-white" size={28} />
        </div>
      </Link>
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Настройки</h1>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6 max-w-lg mx-auto">
          <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Личная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Имя</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} className="bg-black/60 border-rulet-purple/30 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-white">Пол</Label>
                <select id="gender" value={gender} onChange={e => setGender(e.target.value as any)} className="bg-black/60 border-rulet-purple/30 text-white rounded p-2 w-full">
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input id="email" value={user.email} readOnly className="bg-black/60 border-rulet-purple/30 text-white" />
                <p className="text-xs text-gray-400">Email изменить нельзя</p>
              </div>
              <div className="space-y-2 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-rulet-purple/30 flex items-center justify-center overflow-hidden mb-2 border-2 border-rulet-purple/60">
                  {avatarUrl ? (
                    <img src={getAvatarUrl(avatarUrl)} alt="avatar" className="object-cover w-full h-full" />
                  ) : (
                    <UserIcon className="text-rulet-purple" size={48} />
                  )}
                </div>
                <label className="block">
                  <span className="sr-only">Выберите аватар</span>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rulet-purple/20 file:text-rulet-purple hover:file:bg-rulet-purple/40" disabled={avatarUploading} />
                </label>
                {avatarUploading && <div className="text-xs text-gray-400 mt-1">Загрузка...</div>}
              </div>
            </CardContent>
          </Card>
          <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Смена пароля</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Новый пароль</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-black/60 border-rulet-purple/30 text-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm" className="text-white">Подтвердите пароль</Label>
                <Input id="passwordConfirm" type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className="bg-black/60 border-rulet-purple/30 text-white" />
              </div>
            </CardContent>
          </Card>
          {error && <div className="text-red-500 text-center">{error}</div>}
          <Button type="submit" disabled={saving} className="w-full bg-rulet-purple hover:bg-rulet-purple-dark">
            {saving ? "Сохранение..." : "Сохранить настройки"}
          </Button>
        </form>
      </div>
      
      <NavBar />
    </div>
  );
};

export default UserSettingsPage;
