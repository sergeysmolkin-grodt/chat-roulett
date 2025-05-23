import React from 'react';
import VideoChat from '@/components/VideoChat'; // Assuming VideoChat component will be created here
import { useAuth } from '@/contexts/AuthContext'; // Assuming you have an AuthContext

const ChatPage: React.FC = () => {
    const { user } = useAuth();

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
            {/* Контент поверх */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold mb-4 text-center text-white drop-shadow-lg">Chat Roulette</h1>
                <VideoChat />
            </div>
        </div>
    );
};

export default ChatPage; 