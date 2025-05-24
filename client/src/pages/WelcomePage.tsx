import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import DownloadAppButtons from '@/components/DownloadAppButtons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const WelcomePage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rulet-dark p-4 relative">
      <LanguageSwitcher />
      <div className="max-w-3xl mx-auto text-center">
        {/* Adding YNVIETY as the main title, adjusted margins */}
        <div className="mt-20 mb-10">
          <span
            className="text-6xl font-bold tracking-widest drop-shadow-lg bg-gradient-to-r from-green-400 to-purple-600 text-transparent bg-clip-text"
            style={{ fontFamily: 'Bangers, cursive, sans-serif', letterSpacing: '0.15em' }}
          >
            YNYIETY
          </span>
        </div>
        
        <p className="text-xl text-gray-300 mb-8 max-w-xl mx-auto">
          {t('welcome.description')}
        </p>
        
        {/* Centered Start Chatting button */}
        <div className="flex justify-center mb-4">
          <Link to="/chat">
            <Button className="bg-rulet-purple hover:bg-rulet-purple-dark text-white font-bold py-3 px-8 rounded-lg text-lg w-full sm:w-auto">
              {t('welcome.startChatting')}
            </Button>
          </Link>
        </div>
        
        {/* Centered Get Premium and Login buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link to="/premium">
            <Button variant="outline" className="border-rulet-purple text-rulet-purple hover:bg-rulet-purple/10 font-bold py-3 px-8 rounded-lg text-lg w-full sm:w-auto">
              {t('welcome.getPremium')}
            </Button>
          </Link>
          
          <Link to="/login">
            <Button variant="outline" className="border-rulet-purple text-rulet-purple hover:bg-rulet-purple/10 font-bold py-3 px-8 rounded-lg text-lg w-full sm:w-auto">
              {t('welcome.login')}
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30">
            <h3 className="text-white text-lg font-medium mb-2">{t('welcome.features.freeForWomen.title')}</h3>
            <p className="text-gray-400">{t('welcome.features.freeForWomen.description')}</p>
          </div>
          
          <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30">
            <h3 className="text-white text-lg font-medium mb-2">{t('welcome.features.aiVerification.title')}</h3>
            <p className="text-gray-400">{t('welcome.features.aiVerification.description')}</p>
          </div>
          
          <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30">
            <h3 className="text-white text-lg font-medium mb-2">{t('welcome.features.instantConnections.title')}</h3>
            <p className="text-gray-400">{t('welcome.features.instantConnections.description')}</p>
          </div>
        </div>
        
        <div className="mb-8">
          <p className="text-gray-300 mb-4">{t('welcome.newToPlatform')}</p>
          <Link to="/register">
            <Button variant="outline" className="border-rulet-purple text-rulet-purple hover:bg-rulet-purple/10 font-bold py-2 px-6 rounded-lg">
              {t('welcome.registerNow')}
            </Button>
          </Link>
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-4">{t('welcome.getMobileApp.title')}</h2>
        <p className="text-gray-300 mb-6">{t('welcome.getMobileApp.description')}</p>
        <DownloadAppButtons />
      </div>
    </div>
  );
};

export default WelcomePage;
