
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Logo from '@/components/Logo';
import DownloadAppButtons from '@/components/DownloadAppButtons';

const WelcomePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rulet-dark p-4">
      <div className="max-w-3xl mx-auto text-center">
        <div className="mb-8">
          <Logo />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-rulet-purple to-rulet-blue">
            Video Chat Roulette
          </span>
        </h1>
        
        <p className="text-xl text-gray-300 mb-8 max-w-xl mx-auto">
          Connect with new people through random video chats. 
          Free for women, premium access for men.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link to="/chat">
            <Button className="bg-rulet-purple hover:bg-rulet-purple-dark text-white font-bold py-3 px-8 rounded-lg text-lg">
              Start Chatting
            </Button>
          </Link>
          
          <Link to="/premium">
            <Button variant="outline" className="border-rulet-purple text-rulet-purple hover:bg-rulet-purple/10 font-bold py-3 px-8 rounded-lg text-lg">
              Get Premium
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30">
            <h3 className="text-white text-lg font-medium mb-2">Free For Women</h3>
            <p className="text-gray-400">Women enjoy completely free access to all features.</p>
          </div>
          
          <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30">
            <h3 className="text-white text-lg font-medium mb-2">AI Verification</h3>
            <p className="text-gray-400">Our AI ensures users are who they claim to be.</p>
          </div>
          
          <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-rulet-purple/30">
            <h3 className="text-white text-lg font-medium mb-2">Instant Connections</h3>
            <p className="text-gray-400">Premium users get instant matches with real people.</p>
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold text-white mb-4">Get Our Mobile App</h2>
        <p className="text-gray-300 mb-6">Continue your experience on the go with our mobile apps.</p>
        <DownloadAppButtons />
      </div>
    </div>
  );
};

export default WelcomePage;
