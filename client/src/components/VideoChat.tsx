import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import * as apiService from '@/services/apiService';

const VideoChat = () => {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const currentUserId = user ? user.id : null;
  
  const {
    localStream,
    remoteStream,
    isCallActive,
    incomingCall,
    availableVideoDevices,
    selectedVideoDeviceId,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    hangUp,
    initializeLocalStream,
  } = useWebRTC(currentUserId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [targetUserIdInput, setTargetUserIdInput] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingRandom, setIsSearchingRandom] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    } else if (!remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(prev => !prev);
      toast({
        description: !isMuted ? "Microphone turned off" : "Microphone turned on",
      });
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsCameraOff(prev => !prev);
      toast({
        description: !isCameraOff ? "Camera turned off" : "Camera turned on",
      });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        toast({
          variant: "destructive",
          description: `Error attempting to enable fullscreen: ${err.message}`,
        });
      });
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleInitiatePartnerSearch = async () => {
    if (!currentUserId) {
      alert("Please login first.");
      return;
    }
    if (!localStream) {
      alert("Please enable your camera and microphone first.");
      initializeLocalStream();
      return;
    }

    setIsSearching(true);
    setIsSearchingRandom(true);
    try {
      const response = await apiService.findPartner();
      if (response.data && response.data.partner_id) {
        toast({ description: `Partner found: ${response.data.partner_id}. Connecting...` });
        startCall(response.data.partner_id);
      } else {
        toast({ description: "Searching for a partner... No one available right now." });
      }
    } catch (error: any) {
      console.error("Error finding partner:", error);
      toast({
        variant: "destructive",
        description: error.response?.data?.message || "Failed to find partner. Please try again.",
      });
      setIsSearching(false);
      setIsSearchingRandom(false);
    }
  };

  const handleStopPartnerSearch = async () => {
    setIsSearching(false);
    setIsSearchingRandom(false);
    try {
      await apiService.stopSearch();
      toast({ description: "Partner search stopped." });
    } catch (error: any) {
      console.error("Error stopping search:", error);
      toast({
        variant: "destructive",
        description: error.response?.data?.message || "Failed to stop search.",
      });
    }
  };

  const handleStartSearchOrCallNext = () => {
    if (!currentUserId) {
        alert("Please login first.");
        return;
    }
    if (!localStream) {
        alert("Please enable your camera and microphone first.");
        initializeLocalStream();
        return;
    }
    const targetId = parseInt(targetUserIdInput, 10);
    if (!isNaN(targetId) && targetId !== currentUserId) {
      console.log(`Attempting to start call with user ID: ${targetId}`);
      setIsSearching(true);
      setIsSearchingRandom(false);
      startCall(targetId);
    } else if (targetUserIdInput === '') {
      handleInitiatePartnerSearch();
    } else {
      alert('Please enter a valid target User ID (cannot be your own ID) or leave empty to find a random partner.');
    }
  };

  const handleStopCall = () => {
    hangUp();
    setIsSearching(false);
    setIsSearchingRandom(false);
  };

  const handleAcceptCall = () => {
    if (!localStream) {
        alert("Please enable your camera and microphone to accept the call.");
        initializeLocalStream();
        return;
    }
    acceptIncomingCall();
    setIsSearching(false);
    setIsSearchingRandom(false);
  };

  const handleRejectCall = () => {
    rejectIncomingCall();
  };
  
  useEffect(() => {
    if (isCallActive || incomingCall === null) {
        setIsSearching(false);
        setIsSearchingRandom(false);
    }
  }, [isCallActive, incomingCall]);

  const handleCameraSelect = (deviceId: string) => {
    if (deviceId && deviceId !== selectedVideoDeviceId) {
      console.log('Camera selected:', deviceId);
      initializeLocalStream(deviceId);
    }
  };

  if (isAuthLoading) {
    return <div className="w-full h-screen flex items-center justify-center bg-rulet-dark text-white"><p>Loading user...</p></div>;
  }

  if (!isAuthenticated || !currentUserId) {
    return <div className="w-full h-screen flex items-center justify-center bg-rulet-dark text-white"><p>Please log in to use the chat.</p></div>;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-rulet-dark">
      <div className="absolute top-4 left-4 z-10 bg-gray-700 p-2 rounded shadow flex space-x-2 items-center">
        <input 
            type="number" 
            placeholder="Target User ID" 
            value={targetUserIdInput} 
            onChange={(e) => setTargetUserIdInput(e.target.value)} 
            className="p-1 rounded bg-gray-800 text-white border border-gray-600"
            disabled={isCallActive || !!incomingCall || isSearching}
        />
        {availableVideoDevices && availableVideoDevices.length > 1 && (
            <Select 
                onValueChange={handleCameraSelect} 
                defaultValue={selectedVideoDeviceId || undefined}
                disabled={!localStream}
            >
                <SelectTrigger className="w-[200px] bg-gray-800 text-white border-gray-600">
                    <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white">
                    {availableVideoDevices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId} className="hover:bg-gray-700">
                            {device.label || `Camera ${device.deviceId.substring(0, 6)}`}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )}
      </div>

      <ResizablePanelGroup direction="horizontal" className="h-[calc(100%-80px)]">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="relative w-full h-full">
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover bg-rulet-dark"
            />
            {isCameraOff && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <p className="text-white text-lg">Camera Off</p>
              </div>
            )}
            {!localStream && !isAuthLoading && (
                 <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                    <p className="text-white text-lg mb-2">Camera and microphone are not enabled.</p>
                    <Button onClick={() => initializeLocalStream()} className="bg-rulet-purple hover:bg-rulet-purple-dark">
                        Enable Camera & Mic
                    </Button>
                </div>
            )}
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="relative w-full h-full">
            {remoteStream && isCallActive ? (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover bg-rulet-dark"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-rulet-dark">
                <div className="text-center">
                  {isSearching && !isCallActive && !incomingCall && (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rulet-purple mb-4"></div>
                      <p className="text-lg text-white">
                        {isSearchingRandom ? "Searching for a partner..." : `Connecting to user ${targetUserIdInput}...`}
                      </p>
                    </div>
                  )}
                  {incomingCall && !isCallActive && (
                    <div className="flex flex-col items-center">
                      <p className="text-lg text-white mb-4">Incoming call from User ID: {incomingCall.fromUserId}</p>
                      <div className="flex space-x-4">
                        <Button onClick={handleAcceptCall} className="bg-green-500 hover:bg-green-600">Accept</Button>
                        <Button onClick={handleRejectCall} className="bg-red-500 hover:bg-red-600">Reject</Button>
                      </div>
                    </div>
                  )}
                  {!isSearching && !isCallActive && !incomingCall && (
                     <p className="text-lg text-white mb-4">
                        {localStream ? 
                          (isSearchingRandom ? "Searching... Click \"Stop Search\" to cancel." : 
                            (targetUserIdInput ? `Calling User ID: ${targetUserIdInput}...` : 
                              "Click \"Next\" to find a chat partner or enter User ID above."
                            )
                          )
                          : "Enable camera to start."
                        }
                     </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <Button
          onClick={toggleMute}
          disabled={!localStream}
          className={`rounded-full w-12 h-12 flex items-center justify-center ${ 
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-rulet-purple hover:bg-rulet-purple-dark'
          }`}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
        </Button>

        {isCallActive ? (
            <Button
                onClick={handleStopCall}
                className="bg-red-500 hover:bg-red-600 rounded-full w-16 h-16 flex items-center justify-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
            </Button>
        ) : isSearching ? (
             <Button
                onClick={handleStopPartnerSearch}
                disabled={!isSearchingRandom}
                className="bg-yellow-500 hover:bg-yellow-600 rounded-full w-16 h-16 flex items-center justify-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            </Button>
        ) : (
            <Button
                onClick={handleStartSearchOrCallNext}
                disabled={!localStream || !!incomingCall}
                className="bg-rulet-purple hover:bg-rulet-purple-dark rounded-full w-16 h-16 flex items-center justify-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
            </Button>
        )}

        <Button
          onClick={toggleCamera}
          disabled={!localStream}
          className={`rounded-full w-12 h-12 flex items-center justify-center ${ 
            isCameraOff ? 'bg-red-500 hover:bg-red-600' : 'bg-rulet-purple hover:bg-rulet-purple-dark'
          }`}
        >
          {isCameraOff ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <line x1="1" y1="1" x2="23" y2="23"></line>
              <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
};

export default VideoChat;
