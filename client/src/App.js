import React, { useState, useEffect } from 'react';
import './App.css';
import Register from './components/Register';
import Login from './components/Login';
import apiService from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Пытаемся загрузить пользователя при монтировании компонента, если есть токен
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
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

  if (loadingUser) {
    return <p>Загрузка...</p>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Чат Рулетка</h1>
        {user ? (
          <div>
            <p>Привет, {user.name}! ({user.email})</p>
            <p>Пол: {user.gender}</p>
            <button onClick={handleLogout}>Выйти</button>
            {/* Здесь будет основной контент приложения для залогиненного пользователя */}
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

export default App;
