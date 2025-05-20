import React, { useState, useEffect } from 'react';
import './App.css';
import Register from './components/Register';
import Login from './components/Login';
import apiService from './services/api';
import VideoChat from './components/VideoChat';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Замените этим вашим реальным тестовым публикуемым ключом Stripe, если он другой
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RFCooDBsWUdQT4MPTOh8L8jwBXVxjGubrETpsNBg0iZFIn1Lghn7DsrZFEoRE9GKtBAkNhRTT489B1dJpwmyJ8b00xg1joTv5';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

function AppContent() { // Переименовали старый App в AppContent
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Пытаемся загрузить пользователя при монтировании компонента, если есть токен
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Добавим данные о подписке к пользователю, если они есть
          const response = await apiService.getUser();
          setUser(response.data); 
        } catch (error) {
          console.error('Failed to fetch user:', error);
          localStorage.removeItem('authToken'); // Удаляем невалидный токен
        }
      }
      setLoadingUser(false);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Даже если на сервере ошибка, выходим локально
    }
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const handleSubscription = async () => {
    try {
      const response = await apiService.createCheckoutSession();
      const { checkout_url } = response.data;
      if (checkout_url) {
        window.location.href = checkout_url;
      } else {
        console.error('Checkout URL not found');
        // TODO: Показать ошибку пользователю
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      // TODO: Показать ошибку пользователю
    }
  };

  if (loadingUser) {
    return <p>Загрузка...</p>;
  }

  // Проверка URL для страниц успеха/отмены (очень упрощенно)
  if (window.location.pathname === '/payment/success') {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Оплата прошла успешно!</h1>
          <p>Спасибо за вашу подписку.</p>
          <p><a href="/">Вернуться на главную</a></p>
          {/* Здесь можно добавить кнопку для обновления данных пользователя или автоматическое обновление */}
        </header>
      </div>
    );
  }

  if (window.location.pathname === '/payment/cancel') {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Оплата отменена</h1>
          <p>Вы отменили процесс оплаты. Ваша подписка не была оформлена.</p>
          <p><a href="/">Вернуться на главную</a></p>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Чат Рулетка</h1>
        {user ? (
          <div>
            <p>Привет, {user.name}! ({user.email})</p>
            <p>Пол: {user.gender}</p>
            {user.subscription_status === 'active' ? (
              <p>Статус подписки: Активна (до: {user.subscription_ends_at ? new Date(user.subscription_ends_at).toLocaleDateString() : 'N/A'})</p>
            ) : (
              <p>Статус подписки: Неактивна</p>
            )}

            {user.gender === 'male' && user.subscription_status !== 'active' && (
              <button onClick={handleSubscription} style={{marginTop: '10px', padding: '10px', fontSize: '16px'}}>
                Подписаться (20$)
              </button>
            )}
            <button onClick={handleLogout} style={{marginLeft: '10px'}}>Выйти</button>
            {/* Здесь будет основной контент приложения */}
            {user.gender === 'female' || user.subscription_status === 'active' ? (
                <VideoChat />
            ): (
                <p style={{marginTop: '20px', color: 'orange'}}>Для доступа к чат-рулетке мужчинам необходима подписка.</p>
            )}
          </div>
        ) : (
          <div>
            <p>Пожалуйста, войдите или зарегистрируйтесь.</p>
            <hr />
            <Register />
            <hr />
            <Login setUser={setUser} />
          </div>
        )}
      </header>
    </div>
  );
}

// Новый компонент App, который оборачивает AppContent в Elements
function App() {
  return (
    <Elements stripe={stripePromise}>
      <AppContent />
    </Elements>
  );
}

export default App;
