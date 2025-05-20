import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Logo from '@/components/Logo';
import { useToast } from "@/hooks/use-toast";
import apiClient, { getCsrfCookie } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const RegisterPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isFemale, setIsFemale] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCsrfCookie();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      toast({
        title: "Ошибка регистрации",
        description: "Пароли не совпадают.",
        variant: "destructive",
      });
      return;
    }
    if (!termsAccepted) {
      setError("You must accept the terms and conditions.");
      toast({
        title: "Ошибка регистрации",
        description: "Вы должны принять условия использования.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        gender: isFemale ? 'female' : 'male',
      });

      login(response.data.user, response.data.token);
      
      toast({
        title: "Регистрация успешна",
        description: "Вы успешно зарегистрированы!",
      });
      navigate('/');
    } catch (err: any) {
      let errorMessage = "Не удалось зарегистрироваться. Пожалуйста, проверьте свои данные.";
      if (err.response && err.response.data && err.response.data.errors) {
        const errors = err.response.data.errors;
        errorMessage = Object.values(errors).flat().join(' ');
      } else if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
      toast({
        title: "Ошибка регистрации",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-rulet-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Logo />
        </div>
        
        <Card className="border-rulet-purple/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-white">Создать аккаунт</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Введите свои данные для регистрации
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Имя</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="Ваше имя" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Пароль</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-white">Подтверждение пароля</Label>
                <Input 
                  id="confirm" 
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="gender" 
                  checked={isFemale}
                  onCheckedChange={(checked) => setIsFemale(checked as boolean)}
                />
                <Label htmlFor="gender" className="text-gray-300 text-sm">
                  Я женщина (для получения бесплатного доступа)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="terms" 
                  required 
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-gray-300 text-sm">
                  Я согласен(на) с <Link to="/terms" className="text-rulet-purple hover:underline">условиями использования</Link>
                </Label>
              </div>
              
              {error && <p className="text-sm text-red-500">{error}</p>}
              
              <Button type="submit" className="w-full bg-rulet-purple hover:bg-rulet-purple-dark" disabled={isLoading}>
                {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <div className="text-sm text-gray-400">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-rulet-purple hover:underline">
                Войти
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
