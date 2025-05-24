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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ShopPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [isLoadingAntiskip, setIsLoadingAntiskip] = useState(false);
  const [isLoadingPremium, setIsLoadingPremium] = useState(false);

  useEffect(() => {
    document.title = 'YNYIETY.shop';
  }, []);

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
      price: "$15",
      period: t('shopPage.premiumTab.premiumPlan.priceSuffix'),
      features: t('shopPage.premiumTab.premiumPlan.features', { returnObjects: true }) as string[],
      popular: true,
      color: "bg-gradient-to-r from-yellow-500/90 to-amber-600/90",
    }
  ];
  
  const isSubscribed = isAuthenticated && user && user.subscription_status === 'active';
  const isFemale = isAuthenticated && user && user.gender === 'female';

  const antiskipProduct = {
    id: 101,
    name: t('shopPage.premiumTab.antiskip.name'),
    price: "$10",
    description: t('shopPage.premiumTab.antiskip.description'),
    features: t('shopPage.premiumTab.antiskip.features', { returnObjects: true }) as string[],
    color: "bg-gradient-to-br from-slate-700 to-slate-800",
  };

  // Типизация user с antiskip_until
  type UserWithAntiskip = typeof user & { antiskip_until?: string | Date };
  const userWithAntiskip = user as UserWithAntiskip;
  const isAntiskipActive = userWithAntiskip && userWithAntiskip.antiskip_until && new Date(userWithAntiskip.antiskip_until) > new Date();

  const handlePurchaseAntiskip = async () => {
    if (!user) {
      toast({ title: t('shopPage.notifications.loginErrorTitle'), description: t('shopPage.notifications.loginErrorDescription'), variant: "destructive" });
      return;
    }
    setIsLoadingAntiskip(true);
    try {
      const response = await apiClient.post('payment/create-antiskip-checkout-session');
      const { checkout_url } = response.data;
      if (!checkout_url) {
        throw new Error(t('shopPage.notifications.checkoutUrlError'));
      }
      window.location.href = checkout_url;
    } catch (error: any) {
      console.error("Ошибка при создании сессии Stripe Checkout:", error);
      toast({
        title: t('shopPage.notifications.subscriptionErrorTitle'),
        description: t('shopPage.notifications.subscriptionErrorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsLoadingAntiskip(false);
    }
  };

  const handlePurchasePremium = async () => {
    if (!user) {
      toast({ title: t('shopPage.notifications.loginErrorTitle'), description: t('shopPage.notifications.loginErrorDescription'), variant: "destructive" });
      return;
    }
    setIsLoadingPremium(true);
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
        description: t('shopPage.notifications.subscriptionErrorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsLoadingPremium(false);
    }
  };

  const whyPremiumFeatures = t('shopPage.premiumTab.whyPremiumFeatures', { returnObjects: true }) as { title: string, description: string }[];

  const LanguageSwitcher = () => {
    const { i18n } = useTranslation();
    const changeLanguage = (lng: string) => i18n.changeLanguage(lng);
    return (
      <div className="flex gap-1 bg-black/40 rounded-full px-2 py-1 shadow-lg">
        <Button 
          variant={i18n.language === 'ru' ? "secondary" : "ghost"} 
          size="sm"
          onClick={() => changeLanguage('ru')} 
          className="text-xs p-1 h-auto"
        >
          RU
        </Button>
        <Button 
          variant={i18n.language === 'en' ? "secondary" : "ghost"} 
          size="sm"
          onClick={() => changeLanguage('en')} 
          className="text-xs p-1 h-auto"
        >
          EN
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col text-white pb-8">
      <div className="pt-6 px-4">
        <div className="fixed top-6 right-8 z-30 flex gap-4 items-center">
          <LanguageSwitcher />
          {user && (
            <a href="/profile" title={user.username || user.name || 'Профиль'}>
              <Avatar className="w-12 h-12 border-2 border-rulet-purple shadow-lg">
                <AvatarImage src={user.avatar_url || undefined} alt={user.name || ''} />
                <AvatarFallback className="bg-rulet-purple text-white text-xl">{user.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mb-6">
          {/* Удаляю иконку магазина <Store /> */}
        </div>
        
        {/* Удаляю TabsList и TabsTrigger */}
        {/* <TabsList> ... </TabsList> */}
        {/* <TabsTrigger value="premium"> ... </TabsTrigger> */}
        {/* Удаляю TabsContent тоже, если он пустой */}
        {/* <TabsContent value="premium" className="space-y-8"> ... </TabsContent> */}
        {/* Большая прозрачная секция магазина */}
        <div className="w-full flex flex-col items-center justify-center px-4">
          <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm rounded-lg p-8 max-w-3xl w-full mx-auto mt-8">
            <div className="space-y-8">
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

              {/* Карточки: Антискип и Премиум */}
              <div className="flex flex-col lg:flex-row gap-6 justify-center items-start mb-8">
                {/* Антискип */}
                <Card key={antiskipProduct.id} className={`border border-rulet-purple/50 ${antiskipProduct.color} text-white overflow-hidden relative flex flex-col shadow-lg lg:max-w-xs w-full`}>
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-xl">{antiskipProduct.name}</CardTitle>
                    <p className="text-sm text-gray-300">{antiskipProduct.description}</p>
                    {!isAntiskipActive && (
                      <div className="flex items-end gap-1 mt-1">
                        <span className="text-2xl font-bold">{antiskipProduct.price}</span>
                      </div>
                    )}
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
                    {isAntiskipActive ? (
                      <div className="w-full text-center text-sky-400 font-bold text-lg">
                        {t('shopPage.premiumTab.antiskip.active', 'Активен Anti-Skip до')}: {userWithAntiskip?.antiskip_until ? new Date(userWithAntiskip.antiskip_until).toLocaleDateString() : '-'}
                      </div>
                    ) : (
                      <Button 
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 border-0 shadow-md" 
                        onClick={handlePurchaseAntiskip}
                        disabled={isLoadingAntiskip}
                      >
                        {isLoadingAntiskip ? 'Processing...' : t('shopPage.premiumTab.antiskip.buyButton')}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
                {/* Премиум — только для мужчин */}
                {isAuthenticated && user && user.gender === 'male' && (
                  <Card key={premiumPlans[0].id} className={`border-2 border-yellow-500 ${premiumPlans[0].color} text-white overflow-hidden relative flex flex-col shadow-2xl lg:max-w-md w-full`}>
                    {premiumPlans[0].popular && (
                      <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                        {t('shopPage.premiumTab.popularBadge')}
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl">{premiumPlans[0].name}</CardTitle>
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400 bg-black/30">{t('shopPage.premiumTab.recommendedBadge')}</Badge>
                      </div>
                      {!isSubscribed && (
                        <div className="flex items-end gap-1 mt-2">
                          <span className="text-3xl font-bold">{premiumPlans[0].price}</span>
                          <span className="text-base opacity-80">{premiumPlans[0].period}</span>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pb-6 flex-grow">
                      <p className="text-sm text-yellow-100/90 mb-4">{t('shopPage.premiumTab.premiumPlan.unlockFeaturesText')}</p>
                      <ul className="space-y-2 mb-6">
                        {premiumPlans[0].features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <ThumbsUp className="w-5 h-5 text-green-400" />
                            <span className="text-base">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="p-6 bg-black/20">
                      {isSubscribed ? (
                        <div className="w-full text-center text-green-400 font-bold text-lg">
                          {t('shopPage.premiumTab.premium.active', 'Активна Premium-подписка до')}: {user?.subscription_ends_at ? new Date(user.subscription_ends_at).toLocaleDateString() : '-'}
                        </div>
                      ) : (
                        <Button 
                          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black text-lg font-semibold py-3 border-0 shadow-md" 
                          onClick={handlePurchasePremium}
                          disabled={isLoadingPremium}
                        >
                          {isLoadingPremium ? 'Processing...' : t('shopPage.premiumTab.premiumPlan.activateButton')}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                )}
              </div>
              <div className="text-center text-sm text-gray-400 mt-8">
                {t('shopPage.premiumTab.cancellationPolicy')}
              </div>
              {/* Why Premium section: показывать только если не женщина и нет подписки */}
              {!isFemale && !isSubscribed && (
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
