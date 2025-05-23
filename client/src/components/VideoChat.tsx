import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useToast as useShadCNToast } from "@/components/ui/use-toast";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import apiService from '@/services/apiService';
import { toast as sonnerToast } from 'sonner';

// Declare Pusher and Echo on the window object
interface CustomWindow extends Window {
    Pusher?: typeof Pusher;
    Echo?: any; // Using any to suppress persistent linter errors
}
declare let window: CustomWindow;

const VideoChat: React.FC = () => {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const currentLocalStreamRef = useRef<MediaStream | null>(null); // Ref to current stream for cleanup
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [availableVideoDevices, setAvailableVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | undefined>(undefined);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { toast: shadCNToast } = useShadCNToast();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('Click "Search Partner" to start.');
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const echoInstanceRef = useRef<any | null>(null); // Using any
  const echoInitializedRef = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Effect to keep currentLocalStreamRef in sync with localStream state
  useEffect(() => {
    currentLocalStreamRef.current = localStream;
  }, [localStream]);

  // Initialize Local Media Stream
  const initializeLocalStream = useCallback(async (deviceId?: string, isRetryAttempt: boolean = false) => {
    console.log(`Initializing local stream. Device: ${deviceId || "default"}, Retry: ${isRetryAttempt}, Current stream exists: ${!!currentLocalStreamRef.current}`);
    
    if (currentLocalStreamRef.current) {
        console.log("Stopping existing local stream tracks.");
        currentLocalStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
    }
    setIsCameraOff(false);
    setIsMuted(false);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: deviceId ? { exact: deviceId } : undefined, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
        
        const videoDevices = await navigator.mediaDevices.enumerateDevices().then(devices => devices.filter(d => d.kind === 'videoinput'));
        setAvailableVideoDevices(videoDevices);
        if (videoDevices.length > 0) {
            const currentTrackDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
            const newlySelectedDeviceId = deviceId || currentTrackDeviceId || videoDevices[0].deviceId;
            if (newlySelectedDeviceId !== selectedVideoDeviceId) {
                setSelectedVideoDeviceId(newlySelectedDeviceId);
            }
        }
        const successMessage = `${isRetryAttempt ? 'Virtual' : 'User'} camera and Mic initialized.`;
        setStatusMessage(successMessage);
        // sonnerToast.success(successMessage); // Maybe too verbose for every init
        return { stream, error: null };
    } catch (error: any) {
        console.error('Error accessing media devices:', error);
        const errPrefix = isRetryAttempt ? "Error accessing virtual camera" : "Error accessing media device";
        const errMessage = `${errPrefix} (selected: ${deviceId || 'default'}): ${error.message}. Check permissions or select another.`;
        sonnerToast.error(errMessage);
        setStatusMessage(errMessage);
        setLocalStream(null); 
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAvailableVideoDevices(devices.filter(d => d.kind === 'videoinput'));
        });
        return { stream: null, error };
    }
  }, [selectedVideoDeviceId, setSelectedVideoDeviceId]); // Added setSelectedVideoDeviceId for consistency, though already there

  const handleHangUp = useCallback((isTerminatingCall = true) => {
    console.log(`Hanging up. Is terminating call: ${isTerminatingCall}`);
    if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
    }
    setRemoteStream(null);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    const currentRoomId = roomId; // Capture roomId before it's nulled for the leave call
    if (currentRoomId && echoInstanceRef.current) {
        console.log("Leaving room channel:", `video-chat-room.${currentRoomId}`);
        try {
            (echoInstanceRef.current as any).leave(`video-chat-room.${currentRoomId}`);
        } catch (e) { console.warn("Error leaving room channel on hangup:", e); }
    }

    setRoomId(null);
    setPartnerId(null);
    // setIsSearching(false); // Controlled by handleSearch or match success/failure

    if (isTerminatingCall) { 
        setStatusMessage('Call ended. Search again?');
        sonnerToast.info("Call ended.");
    } else { // This is a reset before a new search or after a failed connection attempt
        setStatusMessage('Ready to search or previous connection attempt reset.');
    }
  }, [roomId]); // roomId is a dependency to correctly leave the room channel.

  // Setup RTCPeerConnection
  const setupPeerConnection = useCallback((currentRoomId: string) => {
    console.log("Setting up PeerConnection for room:", currentRoomId);
    if (pcRef.current) {
        pcRef.current.close();
    }
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Add transceivers for audio and video to ensure m-lines are present
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('audio', { direction: 'sendrecv' });

    pc.onicecandidate = event => {
        if (event.candidate && user && currentRoomId && echoInstanceRef.current) {
            apiService.post('/video-chat/send-signal', {
                roomId: currentRoomId,
                signalData: { type: 'candidate', candidate: event.candidate },
            }).catch(err => console.error("ICE send error:", err));
        }
    };

    pc.ontrack = event => {
        console.log('Remote track received:', event.streams[0]);
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
        }
        setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
        if (pcRef.current) {
            console.log("PC state:", pcRef.current.connectionState);
            const state = pcRef.current.connectionState;
            if (state === "disconnected" || state === "failed" || state === "closed") {
                 setStatusMessage(prev => (prev.includes("Connecting") || prev.includes("Call connected")) ? "Partner disconnected or connection lost." : prev);
                 handleHangUp(false);
            }
        }
    };

    if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    } else {
        console.warn("Local stream not available for PC setup. Will proceed without sending local tracks initially.");
        // Optionally, try to initialize it one last time if critical, but for now, proceed without
        // initializeLocalStream(selectedVideoDeviceId).then(stream => {
        //     if (stream && pc.signalingState !== 'closed') {
        //          stream.getTracks().forEach(track => pc.addTrack(track, stream));
        //     }
        // });
    }
    pcRef.current = pc;
    return pc;
  }, [user, handleHangUp]); // Removed localStream, initializeLocalStream, selectedVideoDeviceId from deps

  // Effect to update PC tracks when localStream changes
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') {
      return; // PC not ready or already closed
    }

    console.log("useEffect [localStream]: Updating tracks. Has localStream:", !!localStream);

    const videoTrack = localStream?.getVideoTracks()[0] || null;
    const audioTrack = localStream?.getAudioTracks()[0] || null;

    const videoTransceiver = pc.getTransceivers().find(
      t => (t.sender.track && t.sender.track.kind === 'video') || (t.receiver.track && t.receiver.track.kind === 'video')
    );
    const audioTransceiver = pc.getTransceivers().find(
      t => (t.sender.track && t.sender.track.kind === 'audio') || (t.receiver.track && t.receiver.track.kind === 'audio')
    );

    if (videoTransceiver && videoTransceiver.sender) {
      videoTransceiver.sender.replaceTrack(videoTrack)
        .then(() => console.log(`Video track ${videoTrack ? 'set' : 'cleared'} on transceiver.`))
        .catch(e => console.error('Error replacing video track:', e));
    } else {
        console.warn("Video transceiver sender not found for track replacement.");
    }

    if (audioTransceiver && audioTransceiver.sender) {
      audioTransceiver.sender.replaceTrack(audioTrack)
        .then(() => console.log(`Audio track ${audioTrack ? 'set' : 'cleared'} on transceiver.`))
        .catch(e => console.error('Error replacing audio track:', e));
    } else {
        console.warn("Audio transceiver sender not found for track replacement.");
    }
  }, [localStream]); // Depends on localStream. pcRef.current is accessed but not a reactive dependency here.

  // Handle Incoming Signaling Data
  const handleSignalingData = useCallback(async (data: any) => {
    if (!roomId || !user) return;
    let pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') {
        console.log("PC closed or not found, setting up new one for room:", roomId);
        pc = setupPeerConnection(roomId); // This might return a new pc instance
    }
    if (!pc) { // Still no PC after setup attempt
        console.error("Failed to setup PeerConnection for signaling.");
        sonnerToast.error("Video connection error: PC setup failed.");
        return;
    }

    try {
        if (data.type === 'offer') {
            console.log("Received offer. PC state:", pc.signalingState);
            let stream: MediaStream | null = localStream; // Check current state stream
            if (!stream) {
                const initResult = await initializeLocalStream(selectedVideoDeviceId); // Attempt to initialize
                stream = initResult.stream;
            }
            if (!stream) {
                sonnerToast.info("Your Camera/Mic is not ready. Will receive video/audio but not send.");
            }
            
            // Proceed with offer handling
            if(pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-remote-offer') { // common states to receive an offer
                 await pc.setRemoteDescription(new RTCSessionDescription(data));
                 const answer = await pc.createAnswer();
                 await pc.setLocalDescription(answer);
                 apiService.post('/video-chat/send-signal', {
                     roomId: roomId,
                     signalData: { type: 'answer', sdp: answer.sdp },
                 });
                 setStatusMessage("Call connected!"); 
                 sonnerToast.success("Call connected!");
            } else {
                console.warn("Received offer in unexpected state:", pc.signalingState);
            }

        } else if (data.type === 'answer') {
            console.log("Received answer. PC state:", pc.signalingState);
            if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                setStatusMessage("Call connected!");
                sonnerToast.success("Call connected!");
            } else {
                 console.warn("Received answer in unexpected state:", pc.signalingState);
            }
        } else if (data.type === 'candidate') {
            if (data.candidate && pc.signalingState !== 'closed') {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                    console.error("Error adding ICE candidate:", e);
                }
            }
        }
    } catch (error) {
        console.error('Signaling error:', error);
        sonnerToast.error("Video connection error.");
    }
  }, [roomId, user, localStream, setupPeerConnection, initializeLocalStream, selectedVideoDeviceId]);

   // Create Offer function
   const createOffer = useCallback(async (currentRoomId: string) => {
    if (!user || !currentRoomId) return;
    console.log("Creating offer for room:", currentRoomId);
    let pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') {
        pc = setupPeerConnection(currentRoomId);
    }
    if (!pc) { // Still no PC after setup attempt
        console.error("Failed to setup PeerConnection for creating offer.");
        sonnerToast.error("Video connection error: PC setup failed for offer.");
        return;
    }

    // localStream is managed by its own state and useEffect. 
    // createOffer assumes localStream (and thus tracks on PC via useEffect) is in the desired state.
    // If localStream is null, offer will be made without local tracks (but with m-lines due to transceivers).
    if (!localStream) {
        sonnerToast.info("Your Camera/Mic is not available. Creating offer without sending video/audio.");
    }
    
    try {
        if (pc.signalingState === 'stable') { // Only create offer if in stable state
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            apiService.post('/video-chat/send-signal', {
                roomId: currentRoomId,
                signalData: { type: 'offer', sdp: offer.sdp },
            });
            setStatusMessage('Offer sent. Waiting for partner...');
        } else {
            console.warn("Skipping offer creation, PC not in stable state:", pc.signalingState);
        }
    } catch (error) {
        console.error('Create offer error:', error);
        sonnerToast.error("Failed to create video offer.");
    }
}, [user, localStream, setupPeerConnection]);


  // Initialize Echo
  useEffect(() => {
    if (user && !echoInitializedRef.current && API_BASE_URL) {
        console.log("Attempting to initialize Echo for user:", user.id);
        window.Pusher = Pusher; 
        const instance: any = new Echo({ // Using any
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST,
            wsPort: import.meta.env.VITE_REVERB_PORT || '8080',
            wssPort: import.meta.env.VITE_REVERB_PORT_TLS || '8080',
            forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
            enabledTransports: ['ws', 'wss'],
            authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
            auth: {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
                    Accept: 'application/json',
                },
            },
        });
        echoInstanceRef.current = instance;
        window.Echo = instance;
        echoInitializedRef.current = true;

        console.log("Echo instance created and assigned.");

        (instance as any).private(`user.${user.id}`)
            .listen('.match.found', (event: { roomId: string; userId1: number; userId2: number }) => {
                console.log('Match found event received:', event);
                sonnerToast.success('Partner found!');
                setIsSearching(false);
                
                if (pcRef.current && pcRef.current.signalingState !== 'closed') {
                    pcRef.current.close();
                }
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
                setRemoteStream(null);

                setRoomId(event.roomId); 
                const pId = event.userId1 === user.id ? event.userId2 : event.userId1;
                setPartnerId(pId);
                setStatusMessage(`User ${pId} found. Connecting...`);
                
                let currentPC = pcRef.current; // pcRef.current может быть null или closed от предыдущего вызова
                // Всегда создаем или пересоздаем PeerConnection при новом матче
                console.log("Match found: Setting up new PeerConnection for room:", event.roomId);
                currentPC = setupPeerConnection(event.roomId);
                
                if (!currentPC) {
                     console.error("MATCH_FOUND_ERROR: Failed to setup PeerConnection. Cannot proceed with offer/answer.");
                     sonnerToast.error("Connection setup error after match found.");
                     return;
                }

                // Explicitly apply tracks to the newly created PC if localStream is available
                // This uses the localStream from the outer scope, which should be up-to-date.
                if (localStream && currentPC.signalingState !== 'closed') {
                    console.log("Match found: Explicitly applying tracks to new PC from current localStream");
                    const videoTrack = localStream.getVideoTracks()[0] || null;
                    const audioTrack = localStream.getAudioTracks()[0] || null;
                    currentPC.getTransceivers().forEach(transceiver => {
                        const sender = transceiver.sender;
                        if (!sender) return;
                        if (transceiver.receiver.track?.kind === 'video' || sender.track?.kind === 'video') {
                            sender.replaceTrack(videoTrack).catch(e => console.error("Error replacing video track on match:", e));
                        } else if (transceiver.receiver.track?.kind === 'audio' || sender.track?.kind === 'audio') {
                            sender.replaceTrack(audioTrack).catch(e => console.error("Error replacing audio track on match:", e));
                        }
                    });
                }

                if (user.id < pId) {
                    createOffer(event.roomId); 
                } else {
                    console.log("Match found: This client will await offer. PC state:", currentPC.signalingState);
                }
            });
    }

    return () => {
        if (echoInstanceRef.current && echoInitializedRef.current) { 
            console.log("VideoChat component unmounting: Disconnecting Echo and leaving user channel.");
            try {
                 (echoInstanceRef.current as any).leaveChannel(`user.${user?.id}`); 
            } catch (e) { console.warn("Error leaving user channel on unmount:", e);}
            echoInstanceRef.current.disconnect();
            echoInstanceRef.current = null; 
            echoInitializedRef.current = false; 
            // if (window.Echo === echoInstanceRef.current) window.Echo = undefined; // This check is tricky due to ref being nulled
        }
    };
  }, [user, API_BASE_URL, localStream, createOffer, setupPeerConnection]); // Added localStream, createOffer, setupPeerConnection to deps because they are used in the .listen callback
  // Note: Dependencies like localStream, createOffer, setupPeerConnection in the Echo init useEffect 
  // might still cause re-runs if their references change. They need to be stable.

  // Listen on Room Channel when roomId is set
  useEffect(() => {
    let roomChannelName = '';
    if (roomId && echoInstanceRef.current && user) {
        roomChannelName = `video-chat-room.${roomId}`;
        console.log("Subscribing and listening on room channel:", roomChannelName);
        
        const channel = (echoInstanceRef.current as any).private(roomChannelName);
        channel.listen('.signaling.event', (event: { userId: number; signalData: any }) => {
            if (event.userId === user.id) return;
            handleSignalingData(event.signalData);
        });
        
        return () => {
            if (echoInstanceRef.current && roomChannelName) {
                console.log("Leaving room channel:", roomChannelName);
                try{
                    (echoInstanceRef.current as any).leave(roomChannelName); 
                } catch (e) { console.warn("Error leaving room channel:", e);}
            }
        };
    }
  }, [roomId, user, handleSignalingData]); // handleSignalingData is memoized
  
  // Auto-initialize local stream on mount
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading && !localStream && !pcRef.current) {
        initializeLocalStream(selectedVideoDeviceId).then(result => {
            if (!result.stream && result.error && (result.error.name === 'NotReadableError' || result.error.message?.toLowerCase().includes('device in use') || result.error.message?.toLowerCase().includes('устройство используется'))) {
                 sonnerToast.info("Default camera seems to be in use. You can select another from the list or click search to find a partner (it may try a virtual camera).");
                 // Ensure device list is populated for user selection
                 if (availableVideoDevices.length === 0) {
                    navigator.mediaDevices.enumerateDevices().then(devices => {
                        setAvailableVideoDevices(devices.filter(d => d.kind === 'videoinput'));
                    });
                 }
            }
        });
    }
    // Cleanup on unmount - localStream tracks are stopped by initializeLocalStream if a new one starts, 
    // or by this cleanup if component unmounts with an active stream.
    return () => {
        if (currentLocalStreamRef.current) { // Use ref for cleanup
            console.log("VideoChat unmounting: Stopping local stream tracks.");
            currentLocalStreamRef.current.getTracks().forEach(track => track.stop());
            setLocalStream(null); // Clear state as well
        }
        if (pcRef.current) {
            console.log("VideoChat unmounting: Closing PeerConnection.");
            pcRef.current.close();
            pcRef.current = null;
        }
        if(echoInstanceRef.current) { // Ensure Echo is disconnected on final unmount
            console.log("VideoChat unmounting: Disconnecting Echo.");
            echoInstanceRef.current.disconnect();
            echoInstanceRef.current = null; // Ensure ref is cleared
             if (window.Echo === echoInstanceRef.current) window.Echo = undefined;
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAuthLoading, selectedVideoDeviceId]); // initializeLocalStream is useCallback memoized, selectedVideoDeviceId for initial call

  // Action Handlers
  const handleSearch = async () => {
    if (!user) {
        sonnerToast.error('Login required to search.'); return;
    }
    
    let currentStream: MediaStream | null = localStream;

    if (!currentStream) {
      sonnerToast.info("Attempting to initialize camera...");
      const initResultObject = await initializeLocalStream(selectedVideoDeviceId);
      currentStream = initResultObject.stream;

      if (!currentStream && initResultObject.error && (initResultObject.error.name === 'NotReadableError' || initResultObject.error.message?.toLowerCase().includes('device in use') || initResultObject.error.message?.toLowerCase().includes('устройство используется'))) {
        sonnerToast.info("Primary camera in use or inaccessible. Looking for a virtual camera (e.g., OBS)...", { duration: 4000 });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const virtualCameraKeywords = ['obs', 'virtual', 'droidcam', 'ivcam', 'epoccam', 'camtwist', 'manycam', 'logi capture', 'vcam', 'snap camera', 'mmhmm'];
        
        let foundVirtualCamera: MediaDeviceInfo | null = null;
        for (const device of videoDevices) {
          const deviceLabelLower = device.label.toLowerCase();
          if (virtualCameraKeywords.some(keyword => deviceLabelLower.includes(keyword))) {
            if (device.deviceId !== selectedVideoDeviceId || !selectedVideoDeviceId) { 
              foundVirtualCamera = device;
              break;
            }
          }
        }

        if (foundVirtualCamera) {
          sonnerToast.info(`Found virtual camera: ${foundVirtualCamera.label}. Attempting to use it.`, { duration: 4000 });
          setSelectedVideoDeviceId(foundVirtualCamera.deviceId); 
          const secondInitResultObject = await initializeLocalStream(foundVirtualCamera.deviceId, true);
          currentStream = secondInitResultObject.stream;
          if (currentStream) {
            sonnerToast.success("Virtual camera initialized successfully!");
          } else {
            sonnerToast.error(`Failed to initialize virtual camera (${foundVirtualCamera.label}). It might not be running or configured correctly.`);
          }
        } else if (selectedVideoDeviceId && virtualCameraKeywords.some(k => availableVideoDevices.find(d=>d.deviceId === selectedVideoDeviceId)?.label.toLowerCase().includes(k)) ){
            sonnerToast.info("The selected camera appears to be a virtual camera but could not be started. Please ensure it's running and not in use by another app.");
        } else {
          sonnerToast.info("No alternative virtual camera found. Proceeding without local video if primary/selected camera failed.", { duration: 5000 });
        }
      }

      if (!currentStream) {
        setStatusMessage('No camera/mic. Search continues without sending your video/audio.');
        sonnerToast.info("Continuing search without sending local video/audio.", { duration: 4000 });
      } else {
        // sonnerToast.success("Camera/Mic ready for search."); 
      }
    }

    handleHangUp(false); 
    setIsSearching(true);
    setStatusMessage('Searching for a partner...');
    try {
        const response = await apiService.post('/video-chat/start-searching');
        // Message from backend can be for info, actual matching happens via Echo
        if (response.data.message) {
            console.log("Search API response:", response.data.message);
            if (!response.data.roomId) { // If not immediately matched
                 sonnerToast.info(response.data.message); // e.g., "Searching for a partner..."
            }
        }
    } catch (error: any) {
        setIsSearching(false);
        setStatusMessage('Search error. Please try again.');
        sonnerToast.error(error.response?.data?.message || 'Failed to start search.');
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const currentlyMuted = localStream.getAudioTracks().some(t => !t.enabled);
      localStream.getAudioTracks().forEach(t => t.enabled = currentlyMuted); // Toggle based on current state
      setIsMuted(!currentlyMuted);
      sonnerToast.info(!currentlyMuted ? "Mic Muted" : "Mic Unmuted");
    } else {
        sonnerToast.info("Cannot toggle mute: No active microphone stream.");
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const currentlyOff = localStream.getVideoTracks().some(t => !t.enabled);
      localStream.getVideoTracks().forEach(t => t.enabled = currentlyOff); // Toggle based on current state
      setIsCameraOff(!currentlyOff);
      sonnerToast.info(!currentlyOff ? "Cam Off" : "Cam On");
      // Visibility of local video is handled by CSS/style based on isCameraOff and localStream presence
    } else {
        sonnerToast.info("Cannot toggle camera: No active camera stream.");
    }
  };

  const handleCameraSelect = (deviceId: string) => {
    if (deviceId && deviceId !== selectedVideoDeviceId) {
        setSelectedVideoDeviceId(deviceId); // Update state immediately
        initializeLocalStream(deviceId); // Re-initialize with new device
    }
  };

  // UI Rendering
  if (isAuthLoading && !user) { // Show loading if user data is being fetched and not yet available
    return <div className="flex items-center justify-center h-screen"><p>Loading user data...</p></div>;
  }
  if (!isAuthenticated && !isAuthLoading) { // If loading is finished and still not authenticated
    return <div className="flex items-center justify-center h-screen"><p>Please <a href="/login" className="underline">log in</a> to use the chat.</p></div>;
  }

  return (
    <div className="flex flex-col items-center p-4 bg-rulet-bg text-white min-h-screen">
        <div className="w-full max-w-6xl">
            <div className="mb-4 text-center">
                <p className="text-lg">{statusMessage}</p>
                {user && <p className="text-sm">Logged in as: {user.name} {isMuted ? "[Muted]" : ""} {isCameraOff ? "[Cam Off]" : ""}</p>}
            </div>

            <ResizablePanelGroup direction="horizontal" className="w-full aspect-[16/6] md:aspect-[16/5] rounded-lg border bg-black/30">
                <ResizablePanel defaultSize={50}>
                    <div className="flex h-full items-center justify-center p-1 relative video-container">
                        <video 
                            ref={localVideoRef} 
                            autoPlay 
                            playsInline 
                            muted /* Local video should always be muted by browser for user */
                            className="w-full h-full object-contain rounded-md video-element" 
                            style={{ transform: 'scaleX(-1)', display: localStream && !isCameraOff ? 'block' : 'none' }}
                        />
                        {(!localStream || isCameraOff) && (
                            <div className="abs-center text-gray-400">
                                {isCameraOff && localStream ? "Your Camera is Off" : "Enable Camera & Mic or Select Source"}
                            </div>
                        )}
                        <div className="video-label bottom-2 left-2">{user?.name || 'You'} {localStream && isMuted ? "(Mic Muted)" : ""}</div>
                    </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={50}>
                    <div className="flex h-full items-center justify-center p-1 relative video-container">
                        {remoteStream && remoteVideoRef.current?.srcObject ? (
                            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain rounded-md video-element"/>
                        ) : (
                            <div className="abs-center text-gray-400">{roomId && partnerId ? "Connecting to partner..." : "Waiting for partner video"}</div>
                        )}
                        {partnerId && remoteStream && <div className="video-label bottom-2 right-2">Partner (User {partnerId})</div>}
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            <div className="mt-4 flex flex-wrap justify-center items-center gap-3">
                <Button 
                    onClick={roomId ? () => handleHangUp(true) : handleSearch} 
                    disabled={isSearching} // Only disable if actively searching, or if in call (handled by roomId presence for text)
                    className={`px-8 py-3 text-lg font-semibold rounded-md transition-all duration-150 ease-in-out
                                ${roomId ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                                disabled:bg-gray-500 disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                    {roomId ? 'Hang Up' : isSearching ? 'Searching...' : 'Search Partner'}
                </Button>
                <Button onClick={toggleMute} variant="outline" className="px-4 py-2 bg-gray-700 border-gray-600 hover:bg-gray-600 disabled:opacity-70" disabled={!localStream}>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</Button>
                <Button onClick={toggleCamera} variant="outline" className="px-4 py-2 bg-gray-700 border-gray-600 hover:bg-gray-600 disabled:opacity-70" disabled={!localStream}>{isCameraOff ? 'Camera On' : 'Camera Off'}</Button>

                {availableVideoDevices.length > 0 && ( // Show selector if devices are enumerated, even if no stream yet
                    <Select 
                        onValueChange={handleCameraSelect} 
                        value={selectedVideoDeviceId} 
                        disabled={!!roomId || isSearching} 
                    >
                        <SelectTrigger className="w-[240px] px-4 py-2 bg-gray-700 border-gray-600 hover:bg-gray-600 disabled:opacity-70">
                            <SelectValue placeholder="Select camera" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                            {availableVideoDevices.map((device, index) => (
                                <SelectItem 
                                    key={device.deviceId}
                                    value={device.deviceId}
                                    className="hover:bg-gray-700 focus:bg-gray-600 cursor-pointer"
                                >
                                    {device.label || `Camera ${index + 1}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            <style>{`
                .abs-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
                .video-label { position: absolute; background-color: rgba(0,0,0,0.6); padding: 3px 10px; border-radius: 5px; font-size: 0.8rem; color: white; pointer-events: none; }
                .video-container { background-color: #1a1a1a; border-radius: 0.375rem; overflow: hidden; position: relative; }
                .video-element { background-color: #000;}
            `}</style>
        </div>
    </div>
  );
};

export default VideoChat;
