import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, ThumbsUp, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import apiClient from '@/lib/api';

const ShopPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  const handleInitiateSubscription = async (planId: number) => {
    if (!user) {
      toast({ title: "Ошибка", description: "Пожалуйста, войдите в аккаунт.", variant: "destructive" });
      return;
    }
    if (user.gender === 'female') {
      toast({
        title: "Подписка не требуется",
        description: "Женщинам доступ предоставляется бесплатно.",
        variant: "default"
      });
      return;
    }
    if (user.subscription_status === 'active') {
      toast({
        title: "Подписка уже активна",
        description: "У вас уже есть активная премиум подписка.",
        variant: "default"
      });
      return;
    }

    setIsLoadingCheckout(true);
    try {
      const response = await apiClient.post('payment/create-checkout-session'); 
      const { checkout_url } = response.data;

      if (!checkout_url) {
        throw new Error('Не удалось получить URL для Stripe Checkout.');
      }
      window.location.href = checkout_url;
    } catch (error: any) {
      console.error("Ошибка при создании сессии Stripe Checkout:", error);
      toast({
        title: "Ошибка подписки",
        description: error.response?.data?.message || error.message || "Не удалось инициировать процесс подписки. Попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const premiumPlans = [
    {
      id: 1,
      name: "Базовый",
      price: "299 ₽",
      period: "месяц",
      features: [
        "Неограниченные видеозвонки",
        "Отсутствие рекламы",
        "Приоритетный поиск",
        "HD качество видео"
      ],
      popular: false,
      color: "bg-gradient-to-r from-purple-600/80 to-blue-500/80",
    },
    {
      id: 2,
      name: "Премиум",
      price: "699 ₽",
      period: "месяц",
      features: [
        "Все функции базового плана",
        "Неограниченное количество друзей",
        "Расширенные фильтры поиска",
        "Приоритетная поддержка",
        "Эксклюзивные стикеры и эффекты"
      ],
      popular: true,
      color: "bg-gradient-to-r from-yellow-500/90 to-amber-600/90",
    },
    {
      id: 3,
      name: "VIP",
      price: "1999 ₽",
      period: "месяц",
      features: [
        "Все функции премиум плана",
        "VIP-значок в профиле",
        "Приоритетное размещение в поиске",
        "Персонализированные рекомендации",
        "Бесплатные аксессуары каждый месяц"
      ],
      popular: false,
      color: "bg-gradient-to-r from-pink-600/80 to-rose-600/80",
    }
  ];
  
  const accessories = [
    {
      id: 1,
      name: "Премиум аватары",
      description: "Коллекция эксклюзивных аватаров для вашего профиля",
      price: "99 ₽",
      image: "/placeholder.svg"
    },
    {
      id: 2,
      name: "Анимированные эффекты",
      description: "Специальные эффекты для ваших видеозвонков",
      price: "149 ₽",
      image: "/placeholder.svg",
      tag: "Хит продаж"
    },
    {
      id: 3,
      name: "Набор стикеров",
      description: "30+ уникальных стикеров для чата",
      price: "79 ₽",
      image: "/placeholder.svg"
    },
    {
      id: 4,
      name: "Золотая рамка профиля",
      description: "Выделите свой профиль золотой рамкой VIP",
      price: "199 ₽",
      image: "/placeholder.svg",
      tag: "Новинка"
    }
  ];

  const isSubscribed = isAuthenticated && user && user.subscription_status === 'active';
  const isFemale = isAuthenticated && user && user.gender === 'female';

  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-24">
      <div className="pt-6 px-4">
        <div className="flex items-center gap-2 mb-6">
          <Store className="text-rulet-purple" />
          <h1 className="text-xl font-bold">Магазин</h1>
        </div>
        
        <Tabs defaultValue="premium" className="w-full">
          <TabsList className="bg-black/40 text-gray-400 border-b border-rulet-purple/20 rounded-none w-full mb-6 gap-8">
            <TabsTrigger value="premium" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              Премиум
            </TabsTrigger>
            <TabsTrigger value="accessories" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              Аксессуары
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="premium" className="space-y-8">
            <div className="mb-12 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Upgrade Your Experience</h1>
              <p className="text-gray-300 max-w-xl mx-auto">
                {isFemale 
                  ? "Для вас доступ к основным функциям чата предоставляется бесплатно!"
                  : isSubscribed 
                    ? "Спасибо за вашу подписку! Вы наслаждаетесь всеми премиум преимуществами."
                    : "Получите мгновенный доступ к собеседницам без очередей. Премиум пользователи наслаждаются приоритетным мэтчингом и расширенными функциями."}
              </p>
            </div>

            {isSubscribed && (
              <div className="mb-12 text-center p-6 bg-green-500/10 border border-green-500 rounded-lg">
                  <h2 className="text-2xl font-bold text-green-400">У вас активна Premium подписка!</h2>
                  {user?.subscription_ends_at && (
                      <p className="text-gray-300">Дата окончания подписки: {new Date(user.subscription_ends_at).toLocaleDateString()}</p>
                  )}
              </div>
            )}

            {isFemale && (
               <div className="mb-12 text-center p-6 bg-pink-500/10 border border-pink-500 rounded-lg">
                  <h2 className="text-2xl font-bold text-pink-400">Бесплатный доступ для женщин!</h2>
                  <p className="text-gray-300">Наслаждайтесь всеми прелестями общения без ограничений.</p>
              </div>
            )}
            
            {isAuthenticated && user && user.gender === 'male' && !isSubscribed && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">Активируйте Премиум Доступ</h2>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Получите максимум от нашего сервиса с эксклюзивными возможностями.
                  </p>
                </div>
                {premiumPlans.filter(plan => plan.popular).map(plan => (
                  <Card key={plan.id} className={`border-0 ${plan.color} text-white overflow-hidden relative flex flex-col max-w-lg mx-auto shadow-xl`}>
                    {plan.popular && (
                      <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                        Популярный
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400">Рекомендовано</Badge>
                      </div>
                      <div className="flex items-end gap-1 mt-2">
                        <span className="text-3xl font-bold">{plan.price}</span>
                        <span className="text-base opacity-80">/ {plan.period}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-6 flex-grow">
                      <p className="text-sm text-yellow-100/90 mb-4">Разблокируйте все возможности и общайтесь без ограничений!</p>
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <ThumbsUp className="w-5 h-5 text-green-400" />
                            <span className="text-base">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="p-6 bg-black/20">
                      <Button 
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-black text-lg font-semibold py-3 border-0 shadow-md" 
                        onClick={() => handleInitiateSubscription(plan.id)}
                        disabled={isLoadingCheckout}
                      >
                        {isLoadingCheckout ? "Обработка..." : `Активировать ${plan.name}`}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                <div className="text-center text-sm text-gray-400 mt-6">
                  Отмена подписки в любое время. Безопасные платежи через Stripe.
                </div>
              </>
            )}
            
            <div className="text-center my-16">
              <h2 className="text-2xl font-semibold text-white mb-8">Почему Премиум? (Для Мужчин)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30 hover:shadow-rulet-purple/30 shadow-lg transition-shadow">
                  <div className="text-rulet-purple text-4xl mb-4">
                    <Zap className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-white text-lg font-medium mb-2">Мгновенный Мэтчинг</h3>
                  <p className="text-gray-400">Больше никакого ожидания - подключайтесь к девушкам мгновенно.</p>
                </div>
                
                <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30 hover:shadow-rulet-purple/30 shadow-lg transition-shadow">
                  <div className="text-rulet-purple text-4xl mb-4">
                    <ShieldCheck className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-white text-lg font-medium mb-2">Верифицированные Пользователи</h3>
                  <p className="text-gray-400">Общайтесь с проверенными пользователями для подлинного опыта.</p>
                </div>
                
                <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30 hover:shadow-rulet-purple/30 shadow-lg transition-shadow">
                  <div className="text-rulet-purple text-4xl mb-4">
                    <Sparkles className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-white text-lg font-medium mb-2">Эксклюзивные Функции</h3>
                  <p className="text-gray-400">Наслаждайтесь дополнительными функциями, такими как списки друзей и специальные значки.</p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="accessories" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accessories.map(item => (
                <Card key={item.id} className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1/3 bg-gray-800 h-auto sm:h-full min-h-[100px] relative">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      {item.tag && (
                        <Badge className="absolute top-2 left-2 bg-rulet-purple">
                          {item.tag}
                        </Badge>
                      )}
                    </div>
                    <div className="p-4 flex flex-col justify-between w-full sm:w-2/3">
                      <div>
                        <h3 className="font-medium mb-1">{item.name}</h3>
                        <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">{item.price}</span>
                        <Button size="sm" className="bg-rulet-purple hover:bg-rulet-purple/80">
                          Купить
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShopPage;
