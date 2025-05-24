import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <Button 
        variant={i18n.language === 'en' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 text-sm ${i18n.language === 'en' ? 'bg-rulet-purple text-white' : 'text-gray-300 hover:bg-rulet-purple/20 hover:text-white'}`}>
        EN
      </Button>
      <Button 
        variant={i18n.language === 'ru' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => changeLanguage('ru')}
        className={`px-3 py-1 text-sm ${i18n.language === 'ru' ? 'bg-rulet-purple text-white' : 'text-gray-300 hover:bg-rulet-purple/20 hover:text-white'}`}>
        RU
      </Button>
    </div>
  );
};

export default LanguageSwitcher; 