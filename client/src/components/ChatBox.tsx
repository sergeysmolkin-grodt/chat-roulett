import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: number;
  sender: 'user' | 'partner';
  text: string;
  timestamp: Date;
}

interface ChatBoxProps {
  isOpen: boolean;
  onToggle: () => void;
  connected: boolean;
}

const ChatBox = ({ isOpen, onToggle, connected }: ChatBoxProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() === '' || !connected) return;
    
    // Generate a unique ID for the message
    const newMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: inputText,
      timestamp: new Date()
    };
    
    setMessages([...messages, newMessage]);
    setInputText('');
    
    // Simulate receiving a response (would be replaced with actual WebRTC data channel)
    setTimeout(() => {
      if (Math.random() > 0.5) {  // 50% chance to get a response
        const responses = [
          "Hello there! How are you?",
          "Nice to meet you!",
          "What are your hobbies?",
          "Where are you from?",
          "Having a good day?"
        ];
        
        const responseMessage: Message = {
          id: Date.now(),
          sender: 'partner',
          text: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date()
        };
        
        setMessages(prevMessages => [...prevMessages, responseMessage]);
      }
    }, 1000 + Math.random() * 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-black/60 backdrop-blur-sm border border-rulet-purple/30 rounded-b-xl">
      {/* Chat toggle button */}
      <Button 
        onClick={onToggle}
        className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 h-16 w-8 bg-black/60 backdrop-blur-sm border border-rulet-purple/30 border-r-0 rounded-l-lg p-0"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </Button>

      <div className="flex flex-col h-64 flex-1">
        <div className="p-2 border-b border-rulet-purple/30">
          <h3 className="text-center text-white text-sm">Chat</h3>
        </div>
        
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-3">
          {messages.length > 0 ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`mb-2 max-w-[80%] ${
                  message.sender === 'user' ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div
                  className={`p-2 rounded-lg text-sm ${
                    message.sender === 'user'
                      ? 'bg-rulet-purple text-white rounded-br-none'
                      : 'bg-gray-700 text-white rounded-bl-none'
                  }`}
                >
                  {message.text}
                </div>
                <div
                  className={`text-xs text-gray-400 ${
                    message.sender === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 h-full flex items-center justify-center">
              {connected ? "No messages yet" : "Connect with someone to chat"}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <form onSubmit={handleSendMessage} className="p-2 border-t border-rulet-purple/30 flex">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={connected ? "Type a message..." : "Waiting for connection..."}
            disabled={!connected}
            className="bg-gray-800 border-gray-700 focus:border-rulet-purple focus:ring-rulet-purple text-white"
          />
          <Button 
            type="submit"
            disabled={!connected || inputText.trim() === ''}
            className="ml-2 bg-rulet-purple hover:bg-rulet-purple-dark text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatBox;
