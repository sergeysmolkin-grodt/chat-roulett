
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

const UserSettingsPage = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Имитация сохранения настроек
    setTimeout(() => {
      setSaving(false);
      toast({
        title: "Настройки сохранены",
        description: "Ваши настройки успешно обновлены",
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-24">
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Настройки</h1>
        </div>
        
        <form onSubmit={handleSave}>
          <div className="space-y-6">
            <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Личная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">Имя</Label>
                  <Input 
                    id="name" 
                    defaultValue="Александра" 
                    className="bg-black/60 border-rulet-purple/30 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-white">Имя пользователя</Label>
                  <Input 
                    id="username" 
                    defaultValue="sasha_2000" 
                    className="bg-black/60 border-rulet-purple/30 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-white">О себе</Label>
                  <Textarea 
                    id="bio" 
                    defaultValue="Люблю путешествия и новые знакомства" 
                    className="bg-black/60 border-rulet-purple/30 text-white resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    defaultValue="alexandra@example.com" 
                    className="bg-black/60 border-rulet-purple/30 text-white"
                    readOnly
                  />
                  <p className="text-xs text-gray-400">Для изменения email обратитесь в поддержку</p>
                </div>
              </CardContent>
            </Card>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-rulet-purple/30">
                <AccordionTrigger className="text-white hover:text-rulet-purple">
                  Настройки конфиденциальности
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <span>Показывать мой профиль в поиске</span>
                      <div className="w-16 h-6 bg-rulet-purple rounded-full p-1 flex items-center cursor-pointer">
                        <div className="w-4 h-4 rounded-full bg-white ml-auto"></div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Уведомления о новых чатах</span>
                      <div className="w-16 h-6 bg-gray-700 rounded-full p-1 flex items-center cursor-pointer">
                        <div className="w-4 h-4 rounded-full bg-white"></div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2" className="border-rulet-purple/30">
                <AccordionTrigger className="text-white hover:text-rulet-purple">
                  Безопасность
                </AccordionTrigger>
                <AccordionContent className="text-gray-300">
                  <div className="space-y-4 pt-2">
                    <Button variant="outline" className="border-rulet-purple text-rulet-purple">
                      Изменить пароль
                    </Button>
                    
                    <div className="flex items-center justify-between">
                      <span>Двухфакторная аутентификация</span>
                      <div className="w-16 h-6 bg-gray-700 rounded-full p-1 flex items-center cursor-pointer">
                        <div className="w-4 h-4 rounded-full bg-white"></div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Alert className="bg-black/40 border-red-500/50 text-white">
              <AlertTitle className="text-red-400">Опасная зона</AlertTitle>
              <AlertDescription>
                <Button variant="outline" className="mt-2 border-red-500 text-red-400 hover:bg-red-500/20">
                  Удалить аккаунт
                </Button>
              </AlertDescription>
            </Alert>
            
            <Button type="submit" disabled={saving} className="w-full bg-rulet-purple hover:bg-rulet-purple-dark">
              {saving ? "Сохранение..." : "Сохранить настройки"}
            </Button>
          </div>
        </form>
      </div>
      
      <NavBar isPremium={true} />
    </div>
  );
};

export default UserSettingsPage;
