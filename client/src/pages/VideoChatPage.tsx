import React, { useState, useEffect } from 'react';
import VideoChat from '@/components/VideoChat';
import ChatBox from '@/components/ChatBox';
import NavBar from '@/components/NavBar';
import GenderVerification from '@/components/GenderVerification';
import { useToast } from "@/components/ui/use-toast";
import { useLocation } from 'react-router-dom';

const VideoChatPage = () => {
  const location = useLocation();
  const roomName = location.state?.roomName;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const { toast } = useToast();

  // Initialize camera on component mount
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        console.log('Camera initialized successfully');
      } catch (error) {
        console.error('Error accessing camera:', error);
        toast({
          variant: "destructive",
          title: "Camera Error",
          description: "Unable to access your camera. Please check your permissions.",
        });
      }
    };

    initCamera();

    // Cleanup on unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Function to handle the "Next" button
  const handleNext = () => {
    if (!isVerified) {
      toast({
        title: "Verification Required",
        description: "Please verify your gender before starting a chat.",
      });
      return;
    }

    if (gender === 'male' && !isPremiumUser) {
      toast({
        variant: "destructive",
        title: "Premium Required",
        description: "Male users need a premium subscription to start chatting.",
      });
      return;
    }

    setIsSearching(true);
    setIsConnected(false);
    setRemoteStream(null);

    // Simulate finding a match after a random delay
    const searchTime = 1000 + Math.random() * 4000;
    setTimeout(() => {
      // This is where you would implement the actual WebRTC connection
      // For demo purposes, we'll just set a fake remote stream
      
      // Create a fake remote stream from local stream or a placeholder
      if (localStream) {
        setRemoteStream(localStream);
        setIsConnected(true);
        setIsSearching(false);
        
        toast({
          title: "Connected!",
          description: "You are now chatting with someone.",
        });
      }
    }, searchTime);
  };

  const handleStop = () => {
    setIsSearching(false);
    setIsConnected(false);
    setRemoteStream(null);
    
    toast({
      title: "Disconnected",
      description: "You have ended the chat session.",
    });
  };

  const handleGenderVerified = (detectedGender: 'male' | 'female') => {
    setGender(detectedGender);
    setIsVerified(true);
    
    // If female, no payment needed
    if (detectedGender === 'female') {
      toast({
        title: "Free Access",
        description: "As a female user, you have free access to our platform.",
      });
    } else {
      // If male, check for premium subscription or redirect to payment
      if (!isPremiumUser) {
        toast({
          variant: "destructive",
          title: "Premium Required",
          description: "Male users need a premium subscription to start chatting.",
        });
      }
    }
  };

  if (!isVerified && localStream) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-rulet-dark">
        <GenderVerification
          stream={localStream}
          onGenderVerified={handleGenderVerified}
        />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden">
      {roomName && (
        <div className="w-full bg-black/70 border-b border-rulet-purple/30 py-3 px-6 text-center">
          <span className="text-lg font-semibold text-rulet-purple">{roomName}</span>
        </div>
      )}
      <VideoChat room={roomName} />
      <ChatBox
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        connected={isConnected}
      />
      <NavBar />
    </div>
  );
};

export default VideoChatPage;
