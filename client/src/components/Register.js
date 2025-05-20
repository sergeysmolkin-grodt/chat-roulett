import React, { useState } from 'react';
import apiService from '../services/api';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [gender, setGender] = useState('male'); // Значение по умолчанию
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');
    if (password !== passwordConfirmation) {
      setError('Пароли не совпадают');
      return;
    }
    try {
      const response = await apiService.register({ name, email, password, password_confirmation: passwordConfirmation, gender });
      // TODO: Сохранить токен и данные пользователя (например, в localStorage и состоянии)
      localStorage.setItem('authToken', response.data.access_token);
      console.log('Registration successful:', response.data);
      setSuccessMessage('Регистрация прошла успешно! Теперь вы можете войти.');
      // Очистить поля формы
      setName('');
      setEmail('');
      setPassword('');
      setPasswordConfirmation('');
      setGender('male');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.errors) {
        const errors = Object.values(err.response.data.errors).flat().join(' ');
        setError(errors || 'Ошибка регистрации.');
      } else if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Ошибка регистрации. Пожалуйста, попробуйте снова.');
      }
      console.error('Registration error:', err);
    }
  };

  return (
    <div>
      <h2>Регистрация</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Имя:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Пароль:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label>Подтвердите пароль:</label>
          <input type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} required />
        </div>
        <div>
          <label>Пол:</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} required>
            <option value="male">Мужской</option>
            <option value="female">Женский</option>
            <option value="other">Другой</option>
          </select>
        </div>
        <button type="submit">Зарегистрироваться</button>
      </form>
    </div>
  );
}

export default Register; 