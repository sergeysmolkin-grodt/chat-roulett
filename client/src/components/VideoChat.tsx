import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useToast as useShadCNToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/AuthContext';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import apiService from '@/services/apiService';
import { toast as sonnerToast } from 'sonner';
import { Search, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import useApiService from '@/hooks/useApiService';

// Declare Pusher and Echo on the window object
interface CustomWindow extends Window {
    Pusher?: typeof Pusher;
    Echo?: any; // Using any to suppress persistent linter errors
}
declare let window: CustomWindow;

interface PendingOfferDetails {
  roomId: string;
  isOfferer: boolean;
}

const VideoChat: React.FC = () => {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const apiService = useApiService(); // Assuming useApiService is correctly set up
  
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
  
  const pendingOfferDetailsRef = useRef<PendingOfferDetails | null>(null);
  const offerCreationInProgressRef = useRef(false); // New ref to track offer creation

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]); // Added for ICE candidate queuing
  const echoInstanceRef = useRef<any | null>(null); // Using any
  const echoInitializedRef = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Moved useCallback-memoized functions to the top

  const initializeLocalStream = useCallback(async (deviceId?: string, isRetryAttempt: boolean = false) => {
    console.log(`Initializing local stream. Device: ${deviceId || "default"}, Retry: ${isRetryAttempt}, Current stream ref: ${currentLocalStreamRef.current?.id}`);
    
    // Check if a suitable stream already exists and is active
    if (currentLocalStreamRef.current && currentLocalStreamRef.current.active) {
        const currentTracks = currentLocalStreamRef.current.getVideoTracks();
        if (currentTracks.length > 0) {
            const currentDeviceId = currentTracks[0].getSettings().deviceId;
            if ((!deviceId && currentLocalStreamRef.current) || (deviceId && currentDeviceId === deviceId)) {
                console.log("initializeLocalStream: Active and suitable stream already exists. Reusing it.");
                // Ensure localVideoRef is updated if it somehow lost the stream
                if (localVideoRef.current && localVideoRef.current.srcObject !== currentLocalStreamRef.current) {
                    localVideoRef.current.srcObject = currentLocalStreamRef.current;
                }
                 // Update state if it's out of sync with the ref (e.g. on initial load)
                if (localStream !== currentLocalStreamRef.current) {
                    setLocalStream(currentLocalStreamRef.current);
                }
                return { stream: currentLocalStreamRef.current, error: null };
            }
            console.log(`initializeLocalStream: Existing stream device (${currentDeviceId}) does not match requested (${deviceId}). Proceeding to get new stream.`);
        }
    }

    // If no suitable active stream, stop any existing (potentially old or unsuitable) stream before getting a new one.
    if (currentLocalStreamRef.current) {
        console.log("Stopping existing local stream tracks before acquiring a new one.");
        currentLocalStreamRef.current.getTracks().forEach(track => track.stop());
        currentLocalStreamRef.current = null; // Clear the ref as it's now stopped
    }
    // Also clear the state and video element srcObject immediately
    setLocalStream(null); 
    if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
    }
    // Reset mute/camera off states only when actually acquiring a new stream from scratch
    setIsCameraOff(false); 
    setIsMuted(false);

    console.log(`Attempting to getUserMedia with deviceId: ${deviceId || 'undefined (default)'}`);

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
        console.error(`Failed getUserMedia. DeviceId used: ${deviceId || 'default'}. Error name: ${error.name}, message: ${error.message}`);
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
  }, [selectedVideoDeviceId]); // Dependency: selectedVideoDeviceId (setSelectedVideoDeviceId is a setState, stable)

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

  const setupPeerConnection = useCallback((currentRoomId: string, streamForPc: MediaStream) => {
    console.log("Setting up PeerConnection for room:", currentRoomId, "With stream:", streamForPc.id);
    if (pcRef.current) {
        console.log("Closing existing PeerConnection before setup.");
        pcRef.current.close();
    }
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    console.log("PeerConnection created.");

    if (streamForPc.getVideoTracks().length > 0) {
        const videoTrack = streamForPc.getVideoTracks()[0];
        console.log("Adding video transceiver for track:", videoTrack, "from stream:", streamForPc.id);
        try {
            pc.addTransceiver(videoTrack, { direction: 'sendrecv', streams: [streamForPc] });
        } catch (e) {
            console.error("Error adding video transceiver:", e, videoTrack);
        }
    } else {
        console.log("No video tracks found in streamForPc to add via transceiver.");
    }

    if (streamForPc.getAudioTracks().length > 0) {
        const audioTrack = streamForPc.getAudioTracks()[0];
        console.log("Adding audio transceiver for track:", audioTrack, "from stream:", streamForPc.id);
        try {
            pc.addTransceiver(audioTrack, { direction: 'sendrecv', streams: [streamForPc] });
        } catch (e) {
            console.error("Error adding audio transceiver:", e, audioTrack);
        }
    } else {
        console.log("No audio tracks found in streamForPc to add via transceiver.");
    }

    console.log("Transceivers added (if tracks were available).");

    pc.onicecandidate = event => {
        console.log(`onicecandidate event: ${event.candidate ? 'candidate found' : 'no more candidates'}`);
        if (event.candidate && user && currentRoomId && echoInstanceRef.current) {
            console.log("Sending ICE candidate:", event.candidate);
            apiService.post('/video-chat/send-signal', {
                roomId: currentRoomId,
                signalData: { type: 'candidate', candidate: event.candidate },
            }).catch(err => console.error("ICE send error:", err));
        }
    };
    console.log("onicecandidate handler assigned.");

    pc.ontrack = event => {
        console.log('Remote track received. Stream:', event.streams[0], "Tracks:", event.streams[0]?.getTracks());
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
        }
        setRemoteStream(event.streams[0]);
    };
    console.log("ontrack handler assigned.");

    pc.onconnectionstatechange = () => {
        if (pcRef.current) { // Check pcRef.current as pc might be from a closure
            const currentPC = pcRef.current;
            console.log("PC connection state changed:", currentPC.connectionState);
            const state = currentPC.connectionState;
            if (state === "disconnected" || state === "failed" || state === "closed") {
                 setStatusMessage(prev => (prev.includes("Connecting") || prev.includes("Call connected")) ? "Partner disconnected or connection lost." : prev);
                 console.log(`PC state is ${state}, calling handleHangUp(false).`);
                 handleHangUp(false);
            }
        } else {
            console.log("PC connection state changed, but pcRef.current is null.");
        }
    };
    console.log("onconnectionstatechange handler assigned.");

    pcRef.current = pc;
    console.log("PeerConnection setup complete, pcRef assigned.");
    return pc;
  }, [user, handleHangUp]);

  const createOffer = useCallback(async (currentRoomId: string, isDeferredCall = false) => {
    console.log(`Attempting to create offer. Room: ${currentRoomId}, Deferred: ${isDeferredCall}, HasStream: ${!!localStream}, InProgress: ${offerCreationInProgressRef.current}`);
    if (offerCreationInProgressRef.current && !isDeferredCall) {
        console.warn("createOffer: Offer creation already in progress. Ignoring redundant call.");
        return;
    }
    if (!user || !currentRoomId) {
        console.error('CreateOffer: User or Room ID missing.', { userId: user?.id, currentRoomId });
        offerCreationInProgressRef.current = false; // Reset flag on early exit
        return;
    }

    offerCreationInProgressRef.current = true;

    if (!localStream) {
        console.log('createOffer: Local stream not available. Setting pending offer details for room:', currentRoomId);
        pendingOfferDetailsRef.current = { roomId: currentRoomId, isOfferer: true };
        if (!currentLocalStreamRef.current) {
            console.log("createOffer: Preemptively initializing local stream as it's not available for pending offer.");
            initializeLocalStream(selectedVideoDeviceId, false);
        }
        offerCreationInProgressRef.current = false; // Reset flag, actual offer not created yet
        return;
    }

    let pc = pcRef.current;
    if (!pc || pc.signalingState !== 'stable') {
        console.log(`CreateOffer: PC not ready or not stable (State: ${pc?.signalingState}). Setting up new PC for room: ${currentRoomId}`);
        pc = setupPeerConnection(currentRoomId, localStream);
        if (!pc) {
            console.error("CreateOffer: Failed to setup PeerConnection.");
            sonnerToast.error("Failed to setup video connection.");
            offerCreationInProgressRef.current = false; // Reset flag
            return;
        }
    }

    try {
        console.log("CreateOffer: Creating SDP offer.");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("CreateOffer: Offer created and local description set. Signaling offer.");

        apiService.post('/video-chat/send-signal', {
            roomId: currentRoomId,
            signalData: { type: 'offer', sdp: offer.sdp },
        });
        
        setStatusMessage("Connecting to partner...");
        pendingOfferDetailsRef.current = null; // Offer process initiated, clear pending details
        offerCreationInProgressRef.current = false; // Reset flag after successful initiation

    } catch (error: any) {
        console.error('Create offer error:', error.name, error.message, error);
        sonnerToast.error(`Failed to create video offer: ${error.message}`);
        offerCreationInProgressRef.current = false; // Reset flag on error
        // Do not re-set pendingOfferDetailsRef here, let a new search attempt handle it if needed.
    }
  }, [user, localStream, setupPeerConnection, apiService, setStatusMessage, initializeLocalStream, selectedVideoDeviceId]);

  const handleSignalingData = useCallback(async (data: any) => {
    if (!roomId || !user) {
        console.log("handleSignalingData: roomId or user missing.");
        return;
    }
    console.log("handleSignalingData: Received data type:", data?.type, "Current PC state:", pcRef.current?.signalingState, "Has localStream:", !!localStream);
    
    let currentLocalStream = localStream;
    if (!currentLocalStream) {
        console.log("handleSignalingData: localStream is null, attempting to initialize for receiving offer/answer.");
        const initResult = await initializeLocalStream(selectedVideoDeviceId); 
        currentLocalStream = initResult.stream;
        if(!currentLocalStream) {
            sonnerToast.error("Failed to initialize camera to handle signaling. Cannot proceed.");
            console.error("handleSignalingData: Local stream initialization failed. Cannot setup PC.");
            return;
        }
        console.log("handleSignalingData: localStream initialized for signaling handling.");
    }

    let pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') {
        console.log("handleSignalingData: PC closed or not found, setting up new one WITH localStream for room:", roomId);
        pc = setupPeerConnection(roomId, currentLocalStream); 
    }
    if (!pc) { 
        console.error("handleSignalingData: Failed to setup PeerConnection for signaling.");
        sonnerToast.error("Video connection error: PC setup failed.");
        return;
    }

    const processPendingCandidates = async (currentPC: RTCPeerConnection) => {
        if (pendingIceCandidatesRef.current.length > 0) {
            console.log(`Processing ${pendingIceCandidatesRef.current.length} queued ICE candidates.`);
            for (const candidate of pendingIceCandidatesRef.current) {
                try {
                    await currentPC.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log("Queued ICE candidate added successfully.");
                } catch (e) {
                    console.error("Error adding queued ICE candidate:", e, "Candidate:", candidate, "PC State:", currentPC.signalingState);
                }
            }
            pendingIceCandidatesRef.current = []; // Clear the queue
        }
    };

    try {
        if (data.type === 'offer') {
            console.log("Received offer. PC state before setRemoteDescription:", pc.signalingState, "Offer SDP:", data.sdp ? data.sdp.substring(0,30) + "..." : "N/A");
            let stream: MediaStream | null = currentLocalStream; 
            if (!stream) {
                console.log("handleSignalingData (offer): localStream is null, attempting to initialize.");
                const initResult = await initializeLocalStream(selectedVideoDeviceId); 
                stream = initResult.stream;
                if(stream) console.log("handleSignalingData (offer): localStream initialized successfully.");
                else console.warn("handleSignalingData (offer): localStream initialization failed.");
            }
            if (!stream) {
                sonnerToast.info("Your Camera/Mic is not ready. Will receive video/audio but not send.");
            }
            
            if(pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer' || pc.signalingState === 'have-remote-offer' || pc.signalingState === 'have-local-pranswer') { 
                 await pc.setRemoteDescription(new RTCSessionDescription(data));
                 console.log("Offer set as remote description. PC state:", pc.signalingState);
                 await processPendingCandidates(pc); // Process queued candidates

                 const answer = await pc.createAnswer();
                 console.log("Answer created. PC state before setLocalDescription:", pc.signalingState, "Answer SDP:", answer.sdp ? answer.sdp.substring(0,30) + "..." : "N/A");
                 await pc.setLocalDescription(answer);
                 console.log("Answer set as local description. PC state:", pc.signalingState);
                 apiService.post('/video-chat/send-signal', {
                     roomId: roomId,
                     signalData: { type: 'answer', sdp: answer.sdp },
                 });
                 console.log("Answer sent to signaling server.");
                 setStatusMessage("Call connected!"); 
                 sonnerToast.success("Call connected!");
            } else {
                console.warn("Received offer in unexpected state:", pc.signalingState, "Offer data:", data);
            }

        } else if (data.type === 'answer') {
            console.log("Received answer. PC state before setRemoteDescription:", pc.signalingState, "Answer SDP:", data.sdp ? data.sdp.substring(0,30) + "..." : "N/A");
            if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                console.log("Answer set as remote description. PC state:", pc.signalingState);
                await processPendingCandidates(pc); // Process queued candidates

                setStatusMessage("Call connected!");
                sonnerToast.success("Call connected!");
            } else {
                 console.warn("Received answer in unexpected state:", pc.signalingState, "Answer data:", data);
            }
        } else if (data.type === 'candidate') {
            console.log("Received ICE candidate:", data.candidate);
            if (data.candidate && pc.signalingState !== 'closed') {
                if (pc.remoteDescription) { // Check if remote description is set
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                        console.log("ICE candidate added successfully.");
                    } catch (e) {
                        console.error("Error adding ICE candidate:", e, "Candidate:", data.candidate, "PC State:", pc.signalingState);
                    }
                } else {
                    console.warn("Remote description not set. Queuing ICE candidate.", data.candidate);
                    pendingIceCandidatesRef.current.push(data.candidate);
                }
            } else {
                console.warn("Could not add ICE candidate. PC State:", pc.signalingState, "RemoteDescription Set:", !!pc.remoteDescription, "Candidate:", data.candidate);
            }
        }
    } catch (error) {
        console.error('Signaling error during', data?.type, 'handling:', error);
        sonnerToast.error("Video connection error.");
    }
  }, [roomId, user, localStream, setupPeerConnection, initializeLocalStream, selectedVideoDeviceId, setStatusMessage]);

  const handleSearch = useCallback(async () => {
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
          console.log('Virtual camera init attempt. Stream obtained:', !!currentStream, 'Error:', secondInitResultObject.error);
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
  }, [user, localStream, initializeLocalStream, selectedVideoDeviceId, handleHangUp, availableVideoDevices]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const currentlyMuted = localStream.getAudioTracks().some(t => !t.enabled);
      localStream.getAudioTracks().forEach(t => t.enabled = currentlyMuted); // Toggle based on current state
      setIsMuted(!currentlyMuted);
      sonnerToast.info(!currentlyMuted ? "Mic Muted" : "Mic Unmuted");
    } else {
        sonnerToast.info("Cannot toggle mute: No active microphone stream.");
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const currentlyOff = localStream.getVideoTracks().some(t => !t.enabled);
      localStream.getVideoTracks().forEach(t => t.enabled = currentlyOff); // Toggle based on current state
      setIsCameraOff(!currentlyOff);
      sonnerToast.info(!currentlyOff ? "Cam Off" : "Cam On");
      // Visibility of local video is handled by CSS/style based on isCameraOff and localStream presence
    } else {
        sonnerToast.info("Cannot toggle camera: No active camera stream.");
    }
  }, [localStream]);

  const handleCameraSelect = useCallback((deviceId: string) => {
    if (deviceId && deviceId !== selectedVideoDeviceId) {
        setSelectedVideoDeviceId(deviceId); // Update state immediately
        initializeLocalStream(deviceId); // Re-initialize with new device
    }
  }, [selectedVideoDeviceId, initializeLocalStream]);

  // Effect to keep currentLocalStreamRef in sync with localStream state
  useEffect(() => {
    currentLocalStreamRef.current = localStream;
  }, [localStream]);

  // Effect for handling local stream changes (e.g., when it's initialized or changed)
  useEffect(() => {
    console.log('useEffect [localStream]: Triggered. localStream:', localStream?.id, 'pcRef.current:', pcRef.current?.signalingState, 'pendingOfferDetailsRef.current:', pendingOfferDetailsRef.current);

    if (localStream) {
      // Scenario 1: PeerConnection exists, update tracks
      if (pcRef.current) {
        console.log('useEffect [localStream]: PeerConnection exists. Updating tracks.');
        const videoTrack = localStream.getVideoTracks()[0];
        const audioTrack = localStream.getAudioTracks()[0];

        let videoReplaced = false;
        let audioReplaced = false;

        const videoSender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(videoTrack)
            .then(() => {
              console.log(`useEffect [localStream]: Video track ${videoTrack ? 'set' : 'cleared'} on sender.`);
              videoReplaced = true;
            })
            .catch(e => console.error('useEffect [localStream]: Error replacing video track:', e));
        } else {
          console.warn("useEffect [localStream]: Video sender not found for track replacement.");
        }

        const audioSender = pcRef.current.getSenders().find(s => s.track?.kind === 'audio');
        if (audioSender) {
          audioSender.replaceTrack(audioTrack)
            .then(() => {
              console.log(`useEffect [localStream]: Audio track ${audioTrack ? 'set' : 'cleared'} on sender.`);
              audioReplaced = true;
            })
            .catch(e => console.error('useEffect [localStream]: Error replacing audio track:', e));
        } else {
          console.warn("useEffect [localStream]: Audio sender not found for track replacement.");
        }
      } else {
        console.log('useEffect [localStream]: PeerConnection does NOT exist yet.');
      }

      // Scenario 2: Pending offer details exist, and now local stream is available, so create the offer.
      if (pendingOfferDetailsRef.current && pendingOfferDetailsRef.current.roomId) {
        console.log('useEffect [localStream]: Pending offer details FOUND. RoomId:', pendingOfferDetailsRef.current.roomId, 'isOfferer:', pendingOfferDetailsRef.current.isOfferer);
        if (pendingOfferDetailsRef.current.isOfferer) {
            console.log('useEffect [localStream]: This client is the offerer and local stream is now available. Calling createOffer.');
            createOffer(pendingOfferDetailsRef.current.roomId, true); // Call createOffer as deferred, local stream is now ready
            // pendingOfferDetailsRef.current = null; // createOffer should handle this or set new ones if it fails and needs to retry
        } else {
            console.log('useEffect [localStream]: Pending details exist, but this client is NOT the offerer. Waiting for offer.');
        }
      } else {
        console.log('useEffect [localStream]: No pending offer details found, or roomId is missing.');
      }

    } else {
      console.log('useEffect [localStream]: localStream is null. No action taken regarding tracks or pending offers.');
    }

    // Cleanup: if the stream captured by this effect instance is being removed,
    // and it's the same as the one in currentLocalStreamRef, clear the ref.
    // This is more of a safety for other logic relying on currentLocalStreamRef being accurate.
    const capturedStreamId = localStream?.id;
    return () => {
        if (capturedStreamId && currentLocalStreamRef.current?.id === capturedStreamId) {
            // console.log(`useEffect [localStream]: Cleanup for stream ${capturedStreamId}. If this was the active stream, it might be cleared or replaced.`);
        }
    };
  }, [localStream, createOffer]); // Dependencies: localStream and createOffer

  // Separate useEffect for handling deferred offer creation once all conditions are met
  useEffect(() => {
    const pc = pcRef.current;
    if (localStream && pendingOfferDetailsRef.current && pendingOfferDetailsRef.current.isOfferer && pc && pc.signalingState === 'stable' && !offerCreationInProgressRef.current) {
      console.log("useEffect [pendingOffer Trigger]: Conditions met for deferred offer. Room:", pendingOfferDetailsRef.current.roomId);
      const detailsToOffer = { ...pendingOfferDetailsRef.current }; // Copy details
      // pendingOfferDetailsRef.current = null; // Clear immediately BEFORE calling createOffer if it's a one-shot trigger
                                          // However, createOffer itself will set it to null upon successful signaling or handle re-pending
      createOffer(detailsToOffer.roomId, true); // isDeferredCall = true
    } else if (pendingOfferDetailsRef.current && pendingOfferDetailsRef.current.isOfferer) {
        // Log why the deferred offer isn't being made
        // console.log(`useEffect [pendingOffer Trigger]: Conditions NOT MET. Stream: ${!!localStream}, PC: ${!!pc}, PCState: ${pc?.signalingState}, InProgress: ${offerCreationInProgressRef.current}`);
    }
  }, [localStream, pcRef.current?.signalingState, createOffer]); // Removed pendingOfferDetailsRef.current from deps

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
                console.log('Match found event received:', event, "Current PC ref state:", pcRef.current?.signalingState);
                sonnerToast.success('Partner found!');
                setIsSearching(false);
                
                if (pcRef.current && pcRef.current.signalingState !== 'closed') {
                    console.log("Match found: Closing existing PeerConnection.");
                    pcRef.current.close();
                    pcRef.current = null;
                }
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
                setRemoteStream(null);
                pendingIceCandidatesRef.current = [];

                setRoomId(event.roomId);
                const pId = event.userId1 === user.id ? event.userId2 : event.userId1;
                setPartnerId(pId);
                setStatusMessage(`User ${pId} found. Connecting...`);
                
                if (user.id < pId) { // This client is the offerer
                    console.log("Match found: This client (ID:",user.id,") is the offerer. Preparing to call createOffer for room:", event.roomId);
                    // If localStream is not yet ready, createOffer will set pendingOfferDetails itself.
                    // If it is ready, createOffer will proceed.
                    // No need to set pendingOfferDetailsRef.current here explicitly before calling createOffer.
                    createOffer(event.roomId, false); // Not a deferred call from here
                } else { 
                    console.log("Match found: This client (ID:",user.id,") will await offer.");
                    if (!localStream) {
                        initializeLocalStream(selectedVideoDeviceId);
                    }
                    pendingOfferDetailsRef.current = { roomId: event.roomId, isOfferer: false }; // Set that we are awaiting offer
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
  }, [user, API_BASE_URL]); // MODIFIED: Removed localStream, createOffer, setupPeerConnection
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
            console.log(`[RAW PUSHER EVENT USER: ${user?.id}] Received:`, JSON.stringify(event));
            if (event.userId === user.id) {
                // console.log(`[USER: ${user.id}] Ignoring own signal: ${event.signalData?.type}`);
                return;
            }
            console.log(`[USER: ${user.id}] Processing signal from ${event.userId}, Type: ${event.signalData?.type}`, event.signalData);
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
  }, [isAuthenticated, isAuthLoading]); // MODIFIED: Removed selectedVideoDeviceId

  // UI Rendering
  if (isAuthLoading && !user) {
    return <div className="flex items-center justify-center h-screen"><p>Loading user data...</p></div>;
  }
  if (!isAuthenticated && !isAuthLoading) {
    return <div className="flex items-center justify-center h-screen"><p>Please <a href="/login" className="underline">log in</a> to use the chat.</p></div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-rulet-bg text-white p-0">
      <div className="flex flex-col md:flex-row w-full max-w-5xl h-[60vh] md:h-[70vh] gap-4 md:gap-8 items-center justify-center mt-8">
        {/* Local video */}
        <div className="flex-1 flex items-center justify-center bg-black/60 rounded-xl overflow-hidden min-h-[200px] min-w-[150px] h-full relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain bg-black"
            style={{ display: localStream && !isCameraOff ? 'block' : 'none', transform: 'scaleX(-1)' }}
          />
          {(!localStream || isCameraOff) && (
            <div className="abs-center text-gray-400 text-lg select-none">
              {isCameraOff && localStream ? "Ваша камера выключена" : "Включите камеру и микрофон"}
            </div>
          )}
          <div className="video-label left-2 bottom-2">Вы {localStream && isMuted ? "(Микрофон выкл.)" : ""}</div>
        </div>
        {/* Remote video */}
        <div className="flex-1 flex items-center justify-center bg-black/60 rounded-xl overflow-hidden min-h-[200px] min-w-[150px] h-full relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
            style={{ display: remoteStream ? 'block' : 'none' }}
          />
          {!remoteStream && (
            <div className="abs-center text-gray-400 text-lg select-none">
              {roomId && partnerId ? "Подключение к собеседнику..." : "Ожидание собеседника"}
            </div>
          )}
          {partnerId && remoteStream && <div className="video-label right-2 bottom-2">Собеседник</div>}
        </div>
      </div>
      {/* Controls */}
      <div className="mt-8 flex flex-col items-center gap-4 w-full">
        <div className="flex justify-center items-center gap-6 flex-wrap w-full max-w-2xl mx-auto">
          <button
            onClick={() => setIsMuted(m => !m)}
            disabled={!localStream}
            className={`rounded-full p-3 text-2xl transition-colors duration-150 ${isMuted ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'} disabled:opacity-50`}
            aria-label={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <button
            onClick={() => setIsCameraOff(c => !c)}
            disabled={!localStream}
            className={`rounded-full p-3 text-2xl transition-colors duration-150 ${isCameraOff ? 'bg-red-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'} disabled:opacity-50`}
            aria-label={isCameraOff ? 'Camera On' : 'Camera Off'}
          >
            {isCameraOff ? <VideoOff size={28} /> : <Video size={28} />}
          </button>
          <div className="flex-1 flex justify-center">
            <button
              onClick={roomId ? () => handleHangUp(true) : () => handleSearch()}
              disabled={isSearching}
              className={`rounded-full w-16 h-16 flex items-center justify-center text-3xl shadow-lg transition-all duration-150 ${roomId ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-500 disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-label={roomId ? 'Hang Up' : 'Search Partner'}
            >
              <Search size={32} />
            </button>
          </div>
          {availableVideoDevices.length > 0 && (
            <Select
              onValueChange={setSelectedVideoDeviceId}
              value={selectedVideoDeviceId}
              disabled={!!roomId || isSearching}
            >
              <SelectTrigger className="w-[180px] px-4 py-2 bg-gray-700 border-gray-600 hover:bg-gray-600 disabled:opacity-70">
                <SelectValue placeholder="Камера" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {availableVideoDevices.filter(device => device.deviceId).map((device, index) => (
                  <SelectItem
                    key={device.deviceId}
                    value={device.deviceId}
                    className="hover:bg-gray-700 focus:bg-gray-600 cursor-pointer"
                  >
                    {device.label || `Камера ${index + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <style>{`
        .abs-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        .video-label { position: absolute; background-color: rgba(0,0,0,0.6); padding: 3px 10px; border-radius: 5px; font-size: 0.8rem; color: white; pointer-events: none; }
      `}</style>
    </div>
  );
};

export default VideoChat;

