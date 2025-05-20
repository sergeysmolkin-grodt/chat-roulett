import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import NavBar from "@/components/NavBar";
import { Users, UserPlus } from "lucide-react";

const FriendsPage = () => {
  // Демо-данные для списка друзей
  const friends = [
    {
      id: 1,
      name: "Елена",
      username: "elena_1995",
      lastSeen: "Онлайн",
      isOnline: true,
      avatar: "/placeholder.svg"
    },
    {
      id: 2,
      name: "Михаил",
      username: "misha_cool",
      lastSeen: "5 минут назад",
      isOnline: true,
      avatar: "/placeholder.svg"
    },
    {
      id: 3,
      name: "Анна",
      username: "anna_travel",
      lastSeen: "2 часа назад",
      isOnline: false,
      avatar: "/placeholder.svg"
    },
    {
      id: 4,
      name: "Дмитрий",
      username: "dima_tech",
      lastSeen: "3 дня назад",
      isOnline: false,
      avatar: "/placeholder.svg"
    }
  ];
  
  const friendRequests = [
    {
      id: 5,
      name: "Наталия",
      username: "natali_star",
      mutualFriends: 3,
      avatar: "/placeholder.svg"
    },
    {
      id: 6,
      name: "Алексей",
      username: "alex_gamer",
      mutualFriends: 1,
      avatar: "/placeholder.svg"
    }
  ];
  
  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-20">
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="text-rulet-purple" />
            <h1 className="text-xl font-bold">Друзья</h1>
          </div>
          <Button variant="outline" className="border-rulet-purple text-rulet-purple flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Добавить друга
          </Button>
        </div>
        
        <Input 
          placeholder="Поиск друзей..." 
          className="mb-4 bg-black/40 border-rulet-purple/30 text-white"
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
              {friendRequests.length > 0 && <Badge className="ml-2 bg-rulet-purple">{friendRequests.length}</Badge>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends" className="space-y-3">
            {friends.map(friend => (
              <Card key={friend.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border border-rulet-purple/30">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        {friend.isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-black"></span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{friend.name}</h3>
                        <p className="text-sm text-gray-400">@{friend.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs ${friend.isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                        {friend.lastSeen}
                      </span>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" className="h-8 px-3 border-rulet-purple/50 text-rulet-purple">
                          Видеочат
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="online" className="space-y-3">
            {friends.filter(f => f.isOnline).map(friend => (
              <Card key={friend.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border border-rulet-purple/30">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-black"></span>
                      </div>
                      <div>
                        <h3 className="font-medium">{friend.name}</h3>
                        <p className="text-sm text-gray-400">@{friend.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-green-500">Онлайн</span>
                      <div className="flex gap-2 mt-1">
                        <Button size="sm" variant="outline" className="h-8 px-3 border-rulet-purple/50 text-rulet-purple">
                          Видеочат
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="requests" className="space-y-3">
            {friendRequests.map(request => (
              <Card key={request.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border border-rulet-purple/30">
                        <AvatarImage src={request.avatar} />
                        <AvatarFallback>{request.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{request.name}</h3>
                        <p className="text-sm text-gray-400">@{request.username}</p>
                        <p className="text-xs text-gray-500">{request.mutualFriends} общих друзей</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="default" className="bg-rulet-purple hover:bg-rulet-purple/80">
                        Принять
                      </Button>
                      <Button size="sm" variant="outline" className="border-gray-700">
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
      <NavBar isPremium={true} />
    </div>
  );
};

export default FriendsPage;
