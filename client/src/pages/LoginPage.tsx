import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Logo from '@/components/Logo';
import { useToast } from "@/hooks/use-toast";
import apiClient, { getCsrfCookie } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCsrfCookie();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/login', {
        email,
        password,
      });

      login(response.data.user, response.data.access_token);
      
      toast({
        title: "Вход выполнен",
        description: "Вы успешно вошли в систему!",
      });
      navigate('/');
    } catch (err: any) {
      let errorMessage = "Не удалось войти. Пожалуйста, проверьте свои учетные данные.";
      if (err.response && err.response.data && err.response.data.message) {
        if (err.response.data.message === "Unauthorized") {
          errorMessage = "Неправильный email или пароль.";
        } else {
          errorMessage = err.response.data.message;
        }
      } else if (err.response && err.response.data && err.response.data.errors) {
        errorMessage = Object.values(err.response.data.errors).flat().join(' ');
      }
      setError(errorMessage);
      toast({
        title: "Ошибка входа",
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
            <CardTitle className="text-2xl font-bold text-center text-white">Вход в аккаунт</CardTitle>
            <CardDescription className="text-center text-gray-400">
              Введите свои данные для входа
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-4 p-2 rounded bg-red-500/10 border border-red-500 text-red-500 text-center">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
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
              
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-rulet-purple hover:underline">
                  Забыли пароль?
                </Link>
              </div>
              
              <Button type="submit" className="w-full bg-rulet-purple hover:bg-rulet-purple-dark" disabled={isLoading}>
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <div className="text-sm text-gray-400">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-rulet-purple hover:underline">
                Зарегистрироваться
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
