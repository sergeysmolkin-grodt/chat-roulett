
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import NavBar from "@/components/NavBar";

const UserProfilePage = () => {
  // Здесь будет получение данных пользователя из контекста или API
  const userProfile = {
    name: "Александра",
    username: "sasha_2000",
    bio: "Люблю путешествия и новые знакомства",
    photoUrl: "/placeholder.svg",
    location: "Москва",
    age: 24,
    interests: ["Музыка", "Кино", "Путешествия", "Фотография"],
    joinDate: "Март 2023",
    isPremium: true
  };

  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-20">
      {/* Верхняя секция с аватаром и основной информацией */}
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">Профиль</h1>
          <Button variant="outline" className="border-rulet-purple text-rulet-purple">
            Редактировать
          </Button>
        </div>
        
        <div className="flex flex-col items-center">
          <Avatar className="h-24 w-24 mb-4 border-2 border-rulet-purple">
            <AvatarImage src={userProfile.photoUrl} alt={userProfile.name} />
            <AvatarFallback className="bg-rulet-purple/30 text-white text-xl">
              {userProfile.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <h2 className="text-2xl font-bold mb-1">{userProfile.name}</h2>
          <p className="text-gray-400 mb-2">@{userProfile.username}</p>
          
          {userProfile.isPremium && (
            <Badge className="bg-yellow-500/80 text-black mb-3">Premium</Badge>
          )}
          
          <p className="text-center text-gray-300 max-w-xs mb-6">{userProfile.bio}</p>
        </div>
      </div>

      {/* Информация о пользователе */}
      <div className="px-4 space-y-4">
        <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Личная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Локация:</span>
              <span>{userProfile.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Возраст:</span>
              <span>{userProfile.age}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Дата регистрации:</span>
              <span>{userProfile.joinDate}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Интересы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {userProfile.interests.map((interest, index) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Статистика</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Звонки:</span>
              <span>127</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Друзья:</span>
              <span>42</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Время в приложении:</span>
              <span>73 часа</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <NavBar isPremium={userProfile.isPremium} />
    </div>
  );
};

export default UserProfilePage;
