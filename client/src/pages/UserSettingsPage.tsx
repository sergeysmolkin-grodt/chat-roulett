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

const UserSettingsPage = () => {
  const { toast } = useToast();
  const { user, fetchUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(user?.gender || 'male');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-rulet-dark text-white">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-24">
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
      
      <NavBar isPremium={true} />
    </div>
  );
};

export default UserSettingsPage;
