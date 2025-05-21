import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импортируем файлы переводов (пока создадим заглушки)
import translationRU from './locales/ru/translation.json';
import translationEN from './locales/en/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  ru: {
    translation: translationRU,
  },
};

i18n
  .use(LanguageDetector) // Определяет язык пользователя
  .use(initReactI18next) // Передает экземпляр i18n в react-i18next
  .init({
    resources,
    fallbackLng: 'ru', // Язык по умолчанию, если язык пользователя не найден
    debug: process.env.NODE_ENV === 'development', // Включаем дебаг в режиме разработки
    interpolation: {
      escapeValue: false, // React уже защищает от XSS
    },
    detection: {
      // Порядок и методы определения языка
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'], // Где сохранять выбранный язык
    },
  });

export default i18n; 