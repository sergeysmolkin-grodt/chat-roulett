
import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface VideoChatProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isSearching: boolean;
  onNext: () => void;
  onStop: () => void;
}

const VideoChat = ({
  localStream,
  remoteStream,
  isSearching,
  onNext,
  onStop
}: VideoChatProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      toast({
        description: isMuted ? "Microphone turned on" : "Microphone turned off",
      });
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
      toast({
        description: isCameraOff ? "Camera turned on" : "Camera turned off",
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

  return (
    <div className="relative w-full h-screen overflow-hidden bg-rulet-dark">
      <ResizablePanelGroup direction="horizontal" className="h-[calc(100%-80px)]">
        {/* Local Video (Left half) */}
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
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Remote Video (Right half) */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="relative w-full h-full">
            {remoteStream ? (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover bg-rulet-dark"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-rulet-dark">
                <div className="text-center">
                  {isSearching ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rulet-purple mb-4"></div>
                      <p className="text-lg text-white">Searching for a chat partner...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <p className="text-lg text-white mb-4">Click "Start" to find a chat partner</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Control buttons */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 flex space-x-4">
        <Button
          onClick={toggleMute}
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

        <Button
          onClick={onNext}
          className="bg-rulet-purple hover:bg-rulet-purple-dark rounded-full w-16 h-16 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
        </Button>

        <Button
          onClick={toggleCamera}
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
