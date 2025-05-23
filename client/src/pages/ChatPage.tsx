import React from 'react';
import VideoChat from '@/components/VideoChat'; // Assuming VideoChat component will be created here
import { useAuth } from '@/contexts/AuthContext'; // Assuming you have an AuthContext
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

const ChatPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        return (
            <div className="container mx-auto p-4">
                <p className="text-center text-red-500">Please log in to use the chat.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full relative overflow-hidden">
            {/* Фон на всю страницу */}
            <div
                className="fixed inset-0 w-full h-full z-0"
                style={{
                    backgroundImage: 'url(/bg-popart2.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />
            {/* Иконка профиля справа сверху */}
            <div className="fixed top-6 right-8 z-20 cursor-pointer" onClick={() => navigate('/profile')}>
                <Avatar className="w-12 h-12 border-2 border-rulet-purple shadow-lg">
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                    <AvatarFallback className="bg-rulet-purple text-white text-xl">{user.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
            </div>
            {/* Контент поверх */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold mb-4 text-center text-white drop-shadow-lg"></h1>
                <VideoChat />
            </div>
        </div>  
    );
};

export default ChatPage; 