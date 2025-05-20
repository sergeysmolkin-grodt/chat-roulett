import React, { useState } from 'react';
import apiService from '../services/api';

// Предполагается, что у вас будет функция setUser для обновления состояния пользователя в App.js или Context
function Login({ setUser }) { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await apiService.login({ email, password });
      localStorage.setItem('authToken', response.data.access_token);
      // Сохраняем пользователя в состоянии приложения
      if (setUser) {
        setUser(response.data.user);
      }
      console.log('Login successful:', response.data);
      // TODO: Перенаправить пользователя или обновить UI
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Ошибка входа. Проверьте email и пароль.');
      }
      console.error('Login error:', err);
    }
  };

  return (
    <div>
      <h2>Вход</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Пароль:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}

export default Login; 