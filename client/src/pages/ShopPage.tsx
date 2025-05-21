import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, ThumbsUp, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/components/ui/use-toast";
import apiClient from '@/lib/api';
import { useTranslation } from 'react-i18next';

const ShopPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  const handleInitiateSubscription = async (planId: number) => {
    if (!user) {
      toast({ title: t('shopPage.notifications.loginErrorTitle'), description: t('shopPage.notifications.loginErrorDescription'), variant: "destructive" });
      return;
    }
    if (user.gender === 'female') {
      toast({
        title: t('shopPage.notifications.subscriptionNotNeededTitle'),
        description: t('shopPage.notifications.subscriptionNotNeededDescription'),
        variant: "default"
      });
      return;
    }
    if (user.subscription_status === 'active') {
      toast({
        title: t('shopPage.notifications.subscriptionActiveTitle'),
        description: t('shopPage.notifications.subscriptionActiveDescription'),
        variant: "default"
      });
      return;
    }

    setIsLoadingCheckout(true);
    try {
      const response = await apiClient.post('payment/create-checkout-session'); 
      const { checkout_url } = response.data;

      if (!checkout_url) {
        throw new Error(t('shopPage.notifications.checkoutUrlError'));
      }
      window.location.href = checkout_url;
    } catch (error: any) {
      console.error("Ошибка при создании сессии Stripe Checkout:", error);
      toast({
        title: t('shopPage.notifications.subscriptionErrorTitle'),
        description: error.response?.data?.message || error.message || t('shopPage.notifications.subscriptionErrorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const premiumPlans = [
    {
      id: 1,
      name: t('shopPage.premiumTab.premiumPlan.name'),
      price: "699 ₽",
      period: t('shopPage.premiumTab.premiumPlan.priceSuffix'),
      features: t('shopPage.premiumTab.premiumPlan.features', { returnObjects: true }) as string[],
      popular: true,
      color: "bg-gradient-to-r from-yellow-500/90 to-amber-600/90",
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
      tag: t('shopPage.accessoriesTab.placeholderTag')
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

  const antiskipProduct = {
    id: 101,
    name: t('shopPage.premiumTab.antiskip.name'),
    price: "149 ₽",
    description: t('shopPage.premiumTab.antiskip.description'),
    features: t('shopPage.premiumTab.antiskip.features', { returnObjects: true }) as string[],
    color: "bg-gradient-to-br from-slate-700 to-slate-800",
  };

  const accessoriesProduct = {
    id: 102,
    name: t('shopPage.premiumTab.allAccessories.name'),
    price: "399 ₽",
    description: t('shopPage.premiumTab.allAccessories.description'),
    features: t('shopPage.premiumTab.allAccessories.features', { returnObjects: true }) as string[],
    color: "bg-gradient-to-br from-pink-500/80 to-rose-600/80",
  };

  const handlePurchaseAntiskip = async () => {
    if (!user) {
      toast({ title: t('shopPage.notifications.loginErrorTitle'), description: t('shopPage.notifications.loginErrorDescription'), variant: "destructive" });
      return;
    }
    toast({
      title: t('shopPage.notifications.antiskipPurchaseTitle'),
      description: t('shopPage.notifications.antiskipPurchaseDescription'),
      variant: "default"
    });
  };

  const handlePurchaseAccessories = async () => {
    if (!user) {
      toast({ title: t('shopPage.notifications.loginErrorTitle'), description: t('shopPage.notifications.loginErrorDescription'), variant: "destructive" });
      return;
    }
    toast({
      title: t('shopPage.notifications.allAccessoriesPurchaseTitle'),
      description: t('shopPage.notifications.allAccessoriesPurchaseDescription'),
      variant: "default"
    });
  };

  const whyPremiumFeatures = t('shopPage.premiumTab.whyPremiumFeatures', { returnObjects: true }) as { title: string, description: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-rulet-dark text-white pb-40">
      <div className="pt-6 px-4">
        <div className="flex items-center gap-2 mb-6">
          <Store className="text-rulet-purple" />
          <h1 className="text-xl font-bold">{t('shopPage.title')}</h1>
        </div>
        
        <Tabs defaultValue="premium" className="w-full">
          <TabsList className="bg-black/40 text-gray-400 border-b border-rulet-purple/20 rounded-none w-full mb-6 gap-8">
            <TabsTrigger value="premium" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              {t('shopPage.tabs.premium')}
            </TabsTrigger>
            <TabsTrigger value="accessories" className="data-[state=active]:text-rulet-purple data-[state=active]:border-b-2 data-[state=active]:border-rulet-purple rounded-none h-10 px-4">
              {t('shopPage.tabs.accessoriesStore')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="premium" className="space-y-8">
            <div className="mb-12 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">{t('shopPage.premiumTab.mainTitle')}</h1>
              <p className="text-gray-300 max-w-xl mx-auto">
                {isFemale 
                  ? t('shopPage.premiumTab.mainDescriptionFemale')
                  : isSubscribed 
                    ? t('shopPage.premiumTab.mainDescriptionSubscribed')
                    : t('shopPage.premiumTab.mainDescriptionDefault')}
              </p>
            </div>

            {isSubscribed && (
              <div className="mb-12 text-center p-6 bg-green-500/10 border border-green-500 rounded-lg">
                  <h2 className="text-2xl font-bold text-green-400">{t('shopPage.premiumTab.subscribedMessageTitle')}</h2>
                  {user?.subscription_ends_at && (
                      <p className="text-gray-300">{t('shopPage.premiumTab.subscriptionEndsText')} {new Date(user.subscription_ends_at).toLocaleDateString()}</p>
                  )}
              </div>
            )}

            {isFemale && (
               <div className="mb-12 text-center p-6 bg-pink-500/10 border border-pink-500 rounded-lg">
                  <h2 className="text-2xl font-bold text-pink-400">{t('shopPage.premiumTab.femaleAccessMessageTitle')}</h2>
                  <p className="text-gray-300">{t('shopPage.premiumTab.femaleAccessMessageText')}</p>
              </div>
            )}
            
            {isAuthenticated && user && user.gender === 'male' && !isSubscribed && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold mb-2">{t('shopPage.premiumTab.activatePremiumTitle')}</h2>
                  <p className="text-gray-400 max-w-md mx-auto">
                    {t('shopPage.premiumTab.activatePremiumDescription')}
                  </p>
                </div>
                <div className="flex flex-col lg:flex-row gap-6 justify-center items-start mb-8">
                  <Card key={antiskipProduct.id} className={`border border-rulet-purple/50 ${antiskipProduct.color} text-white overflow-hidden relative flex flex-col shadow-lg lg:max-w-xs w-full`}>
                    <CardHeader className="pb-3 pt-4">
                      <CardTitle className="text-xl">{antiskipProduct.name}</CardTitle>
                      <p className="text-sm text-gray-300">{antiskipProduct.description}</p>
                      <div className="flex items-end gap-1 mt-1">
                        <span className="text-2xl font-bold">{antiskipProduct.price}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 flex-grow">
                      <ul className="space-y-1.5 mb-4">
                        {antiskipProduct.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-sky-400" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="p-4 bg-black/20">
                      <Button 
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 border-0 shadow-md" 
                        onClick={handlePurchaseAntiskip}
                      >
                        {t('shopPage.premiumTab.antiskip.buyButton')}
                      </Button>
                    </CardFooter>
                  </Card>
                  {premiumPlans.map(plan => (
                    <Card key={plan.id} className={`border-2 border-yellow-500 ${plan.color} text-white overflow-hidden relative flex flex-col shadow-2xl lg:max-w-md w-full`}>
                      {plan.popular && (
                        <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                          {t('shopPage.premiumTab.popularBadge')}
                        </div>
                      )}
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-2xl">{plan.name}</CardTitle>
                          <Badge variant="outline" className="text-yellow-400 border-yellow-400 bg-black/30">{t('shopPage.premiumTab.recommendedBadge')}</Badge>
                        </div>
                        <div className="flex items-end gap-1 mt-2">
                          <span className="text-3xl font-bold">{plan.price}</span>
                          <span className="text-base opacity-80">{plan.period}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-6 flex-grow">
                        <p className="text-sm text-yellow-100/90 mb-4">{t('shopPage.premiumTab.premiumPlan.unlockFeaturesText')}</p>
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
                          {isLoadingCheckout ? t('shopPage.premiumTab.processingButton') : t('shopPage.premiumTab.premiumPlan.activateButton')}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                  <Card key={accessoriesProduct.id} className={`border border-pink-400/60 ${accessoriesProduct.color} text-white overflow-hidden relative flex flex-col shadow-lg lg:max-w-xs w-full`}>
                    <CardHeader className="pb-3 pt-4">
                      <CardTitle className="text-xl">{accessoriesProduct.name}</CardTitle>
                      <p className="text-sm text-gray-100">{accessoriesProduct.description}</p>
                      <div className="flex items-end gap-1 mt-1">
                        <span className="text-2xl font-bold">{accessoriesProduct.price}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 flex-grow">
                      <ul className="space-y-1.5 mb-4">
                        {accessoriesProduct.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-pink-200" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="p-4 bg-black/20">
                      <Button 
                        className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 border-0 shadow-md" 
                        onClick={handlePurchaseAccessories}
                      >
                        {t('shopPage.premiumTab.allAccessories.buyButton')}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
                <div className="text-center text-sm text-gray-400 mt-8">
                  {t('shopPage.premiumTab.cancellationPolicy')}
                </div>
              </>
            )}
            
            {/* Why Premium section: показывать только если не женщина */}
            {!isFemale && (
              <div className="text-center my-16">
                <h2 className="text-2xl font-semibold text-white mb-8">{t('shopPage.premiumTab.whyPremiumTitle')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {whyPremiumFeatures.map((item, index) => (
                    <div key={index} className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30 hover:shadow-rulet-purple/30 shadow-lg transition-shadow">
                      <div className="text-rulet-purple text-4xl mb-4">
                        {index === 0 && <Zap className="w-12 h-12 mx-auto" />}
                        {index === 1 && <ShieldCheck className="w-12 h-12 mx-auto" />}
                        {index === 2 && <Sparkles className="w-12 h-12 mx-auto" />}
                      </div>
                      <h3 className="text-white text-lg font-medium mb-2">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                          {t('shopPage.accessoriesTab.buyButton')}
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
      <div className="h-[300px] bg-transparent" />
    </div>
  );
};

export default ShopPage;
