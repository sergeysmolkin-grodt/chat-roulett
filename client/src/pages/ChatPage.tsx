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
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-center">Chat Roulette</h1>
            <VideoChat />
        </div>
    );
};

export default ChatPage; 