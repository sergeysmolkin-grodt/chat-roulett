import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import apiService from '@/services/apiService';

// @ts-ignore // Pusher types might not align perfectly with Echo's expectations initially
window.Pusher = Pusher;

const VITE_REVERB_APP_KEY = import.meta.env.VITE_REVERB_APP_KEY || 'local_app_key';
const VITE_REVERB_HOST = import.meta.env.VITE_REVERB_HOST || 'localhost';
const VITE_REVERB_PORT = parseInt(import.meta.env.VITE_REVERB_PORT || '9095', 10);
const VITE_REVERB_SCHEME = import.meta.env.VITE_REVERB_SCHEME || 'ws';


const echo = new Echo({
    broadcaster: 'reverb',
    key: VITE_REVERB_APP_KEY,
    wsHost: VITE_REVERB_HOST,
    wsPort: VITE_REVERB_PORT,
    wssPort: VITE_REVERB_PORT, // Для Reverb wsPort и wssPort обычно одинаковы, если TLS терминируется на Reverb
    forceTLS: VITE_REVERB_SCHEME === 'wss',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/api/broadcasting/auth', // Исправлено для работы с API-префиксом
    // Для подключения к приватным каналам, Echo будет использовать /broadcasting/auth эндпоинт
    // Laravel Sanctum должен автоматически обрабатывать этот запрос, если cookies настроены правильно
    // или если мы передаем токен.
    // Убедимся, что наш apiService (axios instance) настроен на withCredentials: true
     authorizer: (channel, options) => { // Пример кастомного authorizer если нужно
         return {
             authorize: (socketId, callback) => {
                 apiService.post('/broadcasting/auth', {
                     socket_id: socketId,
                     channel_name: channel.name
                 })
                 .then(response => {
                     callback(null, response.data);
                 })
                 .catch(error => {
                     callback(error, null);
                 });
             }
         };
     },
});

export default echo;