import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';

interface PremiumSubscriptionProps {
  onSubscribe: () => void;
  isLoading: boolean;
}

const PremiumSubscription = ({ onSubscribe, isLoading }: PremiumSubscriptionProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <p className="text-center text-gray-400">Пожалуйста, войдите в систему, чтобы управлять подпиской.</p>;
  }

  if (user.gender === 'female') {
    return <p className="text-center text-white">Для женщин доступ предоставляется бесплатно!</p>;
  }

  if (user.subscription_status === 'active') {
    return (
      <div className="text-center">
        <h3 className="text-xl font-semibold text-green-400">У вас активна Premium подписка!</h3>
        {user.subscription_ends_at && 
          <p className="text-gray-300">Дата окончания: {new Date(user.subscription_ends_at).toLocaleDateString()}</p>
        }
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="bg-black/60 border border-rulet-purple/30 p-6 backdrop-blur-sm">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Premium Access</h2>
          <p className="text-gray-300">Get priority access to chat with female users</p>
        </div>
        
        <div className="bg-gradient-to-br from-rulet-purple/20 to-rulet-purple-dark/30 rounded-lg p-6 mb-6 border border-rulet-purple/30">
          <div className="flex justify-center mb-2">
            <span className="text-3xl font-bold text-white">$20</span>
            <span className="text-xl text-gray-300 self-end ml-1">/month</span>
          </div>
          
          <ul className="space-y-3 mb-6">
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-white">Instant matches with female users</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-white">No waiting in queue</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-white">Premium badge on your profile</span>
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-white">Add up to 50 friends</span>
            </li>
          </ul>
          
          <Button 
            onClick={onSubscribe} 
            className="w-full bg-rulet-purple hover:bg-rulet-purple-dark text-white font-semibold py-3 rounded-lg transition duration-200"
            disabled={isLoading}
          >
            {isLoading ? 'Обработка...' : 'Subscribe Now'}
          </Button>
        </div>
        
        <div className="text-xs text-center text-gray-400">
          <p>Subscription renews automatically. Cancel anytime.</p>
          <p className="mt-2">By subscribing, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </Card>
    </div>
  );
};

export default PremiumSubscription;
