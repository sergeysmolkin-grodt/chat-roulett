import React, { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import PremiumSubscription from '@/components/PremiumSubscription';
import Logo from '@/components/Logo';
import DownloadAppButtons from '@/components/DownloadAppButtons';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';

const PremiumPage = () => {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  useEffect(() => {
    document.title = 'YNYIETY';
  }, []);

  const handleInitiateSubscription = async () => {
    if (!user || user.gender !== 'male' || user.subscription_status === 'active') {
      toast({
        title: "Подписка недоступна",
        description: user?.gender === 'female' ? "Женщинам доступ предоставляется бесплатно." : "У вас уже есть активная подписка или подписка недоступна.",
        variant: "destructive"
      });
      return;
    }
    setIsLoadingCheckout(true);
    try {
      const response = await apiClient.post('payment/create-checkout-session');
      const { stripe_public_key, checkout_url } = response.data;

      if (!stripe_public_key || !checkout_url) {
        throw new Error('Не удалось получить данные для Stripe Checkout.');
      }

      setStripePromise(loadStripe(stripe_public_key));
      setCheckoutUrl(checkout_url);
      window.location.href = checkout_url;

    } catch (error: any) {
      console.error("Ошибка при создании сессии Stripe Checkout:", error);
      toast({
        title: "Ошибка подписки",
        description: error.message || "Не удалось инициировать процесс подписки. Попробуйте позже.",
        variant: "destructive",
      });
      setStripePromise(null);
      setCheckoutUrl(null);
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const showSubscriptionBlock = isAuthenticated && user && user.gender === 'male' && user.subscription_status !== 'active';
  const isSubscribed = isAuthenticated && user && user.subscription_status === 'active';
  const isFemale = isAuthenticated && user && user.gender === 'female';

  return (
    <div className="min-h-screen bg-rulet-dark flex flex-col pb-16">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Logo />
          </div>
          
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Upgrade Your Experience</h1>
            <p className="text-gray-300 max-w-xl mx-auto">
              {isFemale 
                ? "Для вас доступ к основным функциям чата предоставляется бесплатно!"
                : isSubscribed 
                  ? "Спасибо за вашу подписку! Вы наслаждаетесь всеми премиум преимуществами."
                  : "Get instant access to female chat partners without waiting in queue. Premium users enjoy priority matching and enhanced features."}
            </p>
          </div>
          
          {showSubscriptionBlock && (
            <div className="mb-12">
              <PremiumSubscription onSubscribe={handleInitiateSubscription} isLoading={isLoadingCheckout} />
            </div>
          )}

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
          
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Why Choose Premium? (For Men)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30">
                <div className="text-rulet-purple text-4xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12 mx-auto">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-medium mb-2">Instant Matching</h3>
                <p className="text-gray-400">No more waiting - get instantly connected to female chat partners.</p>
              </div>
              
              <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30">
                <div className="text-rulet-purple text-4xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12 mx-auto">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-medium mb-2">Verified Users</h3>
                <p className="text-gray-400">Chat with verified users for an authentic experience.</p>
              </div>
              
              <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30">
                <div className="text-rulet-purple text-4xl mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12 mx-auto">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-white text-lg font-medium mb-2">Premium Features</h3>
                <p className="text-gray-400">Enjoy additional features like friend lists and special badges.</p>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">Get Our Mobile App</h2>
            <p className="text-gray-300 mb-6">Continue your experience on the go with our mobile apps.</p>
            <DownloadAppButtons />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
