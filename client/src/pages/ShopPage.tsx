
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NavBar from "@/components/NavBar";
import { Store } from "lucide-react";

const ShopPage = () => {
  // Демо-данные для магазина
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
      color: "bg-gradient-to-r from-purple-600/80 to-blue-500/80"
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
      color: "bg-gradient-to-r from-yellow-500/90 to-amber-600/90"
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
      color: "bg-gradient-to-r from-pink-600/80 to-rose-600/80"
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

  return (
    <div className="min-h-screen bg-rulet-dark text-white pb-20">
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
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Выберите премиум-план</h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Получите доступ к эксклюзивным функциям и улучшите свой опыт видеочатов
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {premiumPlans.map(plan => (
                <Card key={plan.id} className={`border-0 ${plan.color} text-white overflow-hidden relative`}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rotate-0">
                      Популярный
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-sm opacity-80">/ {plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-white/20 hover:bg-white/30 text-white border-0">
                      Выбрать план
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            <div className="text-center text-sm text-gray-400 mt-4">
              Отмена подписки в любое время. Без скрытых платежей.
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
      
      <NavBar isPremium={true} />
    </div>
  );
};

export default ShopPage;
