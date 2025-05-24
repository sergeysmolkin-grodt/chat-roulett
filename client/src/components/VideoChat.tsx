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
  
  const [pendingOfferDetails, setPendingOfferDetails] = useState<{ roomId: string } | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const echoInstanceRef = useRef<any | null>(null); // Using any
  const echoInitializedRef = useRef(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Moved useCallback-memoized functions to the top

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

  const setupPeerConnection = useCallback((currentRoomId: string) => {
    console.log("Setting up PeerConnection for room:", currentRoomId);
    if (pcRef.current) {
        console.log("Closing existing PeerConnection before setup.");
        pcRef.current.close();
    }
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    console.log("PeerConnection created.");

    // Add transceivers for audio and video to ensure m-lines are present
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    console.log("Transceivers added.");

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

    // Tracks will be added by the useEffect watching [localStream]
    // if (localStream) {
    //     console.log("Local stream exists, adding tracks to new PC.");
    //     localStream.getTracks().forEach(track => {
    //         console.log("Adding track to PC:", track);
    //         pc.addTrack(track, localStream);
    //     });
    // } else {
    //     console.warn("Local stream not available for PC setup. Will proceed without sending local tracks initially.");
    // }
    pcRef.current = pc;
    console.log("PeerConnection setup complete, pcRef assigned.");
    return pc;
  }, [user, handleHangUp]); // MODIFIED: Removed localStream from dependencies

  const createOffer = useCallback(async (currentRoomId: string, isDeferredCall = false) => {
    if (!user || !currentRoomId) {
        console.log("createOffer: User or currentRoomId missing, returning.", "User:", !!user, "RoomID:", currentRoomId);
        return;
    }
    console.log(`Creating offer for room: ${currentRoomId}. Is deferred: ${isDeferredCall}`);
    let pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') {
        console.log("createOffer: PC closed or not found, setting up new one.");
        pc = setupPeerConnection(currentRoomId);
    }
    if (!pc) { 
        console.error("createOffer: Failed to setup PeerConnection for creating offer.");
        sonnerToast.error("Video connection error: PC setup failed for offer.");
        return;
    }
    
    if (!localStream) {
        if (!isDeferredCall) { // Only set pending if this is the initial, non-deferred call
            console.warn("createOffer: Local stream not available. Setting pending offer details for room:", currentRoomId);
            setPendingOfferDetails({ roomId: currentRoomId });
            setStatusMessage('Camera initializing, preparing to send offer...');
        }
        // For both initial and deferred calls, if stream is still not here, log and exit
        console.warn("createOffer: Local stream still not available. Offer will not be made at this time.");
        // sonnerToast.info("Your Camera/Mic is not available. Waiting for it to send offer.");
        return; 
    } else {
        console.log("createOffer: Local stream available. Tracks should be on PC (or will be shortly by useEffect).");
    }
    
    // Ensure PC is stable. If it's not, and this is a deferred call, something else might be wrong.
    // If it's an initial call and not stable, it might be okay if it becomes stable soon.
    if (pc.signalingState !== 'stable') {
        console.warn(`Skipping offer creation, PC not in stable state: ${pc.signalingState}. isDeferredCall: ${isDeferredCall}`);
        // If it's an initial call and not stable, perhaps we should also pend, or rely on future calls?
        // For now, only proceed if stable.
        if (!isDeferredCall) {
             // Maybe set pending again if not stable on initial call? Or assume another mechanism will retry?
        }
        return; 
    }

    try {
        // This part should only execute if localStream is available AND pc is stable.
        console.log("PC is stable, creating offer. PC state:", pc.signalingState);
        const offer = await pc.createOffer();
        console.log("Offer created. PC state before setLocalDescription:", pc.signalingState, "Offer SDP:", offer.sdp ? offer.sdp.substring(0,30)+"..." : "N/A");
        await pc.setLocalDescription(offer);
        console.log("Offer set as local description. PC state:", pc.signalingState);
        apiService.post('/video-chat/send-signal', {
            roomId: currentRoomId,
            signalData: { type: 'offer', sdp: offer.sdp },
        });
        console.log("Offer sent to signaling server.");
        setStatusMessage('Offer sent. Waiting for partner...');
    } catch (error) {
        console.error('Create offer error:', error);
        sonnerToast.error("Failed to create video offer.");
    }
}, [user, localStream, setupPeerConnection]);

  const handleSignalingData = useCallback(async (data: any) => {
    if (!roomId || !user) {
        console.log("handleSignalingData: roomId or user missing, returning.", "RoomID:", roomId, "User:", !!user);
        return;
    }
    let pc = pcRef.current;
    console.log("handleSignalingData: Received data type:", data?.type, "Current PC state:", pc?.signalingState);

    if (!pc || pc.signalingState === 'closed') {
        console.log("handleSignalingData: PC closed or not found, setting up new one for room:", roomId);
        pc = setupPeerConnection(roomId); 
    }
    if (!pc) { 
        console.error("handleSignalingData: Failed to setup PeerConnection for signaling.");
        sonnerToast.error("Video connection error: PC setup failed.");
        return;
    }

    try {
        if (data.type === 'offer') {
            console.log("Received offer. PC state before setRemoteDescription:", pc.signalingState, "Offer SDP:", data.sdp ? data.sdp.substring(0,30) + "..." : "N/A");
            let stream: MediaStream | null = localStream; 
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
                setStatusMessage("Call connected!");
                sonnerToast.success("Call connected!");
            } else {
                 console.warn("Received answer in unexpected state:", pc.signalingState, "Answer data:", data);
            }
        } else if (data.type === 'candidate') {
            console.log("Received ICE candidate:", data.candidate);
            if (data.candidate && pc.signalingState !== 'closed' && pc.remoteDescription) { // Ensure remoteDescription is set before adding candidates
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    console.log("ICE candidate added successfully.");
                } catch (e) {
                    console.error("Error adding ICE candidate:", e, "Candidate:", data.candidate, "PC State:", pc.signalingState);
                }
            } else {
                console.warn("Could not add ICE candidate. PC State:", pc.signalingState, "RemoteDescription Set:", !!pc.remoteDescription, "Candidate:", data.candidate);
            }
        }
    } catch (error) {
        console.error('Signaling error during', data?.type, 'handling:', error);
        sonnerToast.error("Video connection error.");
    }
  }, [roomId, user, localStream, setupPeerConnection, initializeLocalStream, selectedVideoDeviceId]);

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

  // Effect to update PC tracks when localStream changes
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === 'closed') {
      console.log("useEffect [localStream]: PC not ready or closed, skipping track update. PC:", pc, "Signaling state:", pc?.signalingState);
      return; 
    }

    console.log("useEffect [localStream]: Updating tracks. Has localStream:", !!localStream);

    const videoTrack = localStream?.getVideoTracks()[0] || null;
    const audioTrack = localStream?.getAudioTracks()[0] || null;

    let videoReplaced = false;
    let audioReplaced = false;

    const videoTransceiver = pc.getTransceivers().find(
      t => (t.sender.track && t.sender.track.kind === 'video') || (t.receiver.track && t.receiver.track.kind === 'video')
    );
    const audioTransceiver = pc.getTransceivers().find(
      t => (t.sender.track && t.sender.track.kind === 'audio') || (t.receiver.track && t.receiver.track.kind === 'audio')
    );

    if (videoTransceiver && videoTransceiver.sender) {
      videoTransceiver.sender.replaceTrack(videoTrack)
        .then(() => {
            console.log(`Video track ${videoTrack ? 'set' : 'cleared'} on transceiver.`);
            videoReplaced = true;
            // Check for pending offer after video track is handled
            if (pendingOfferDetails && pc.signalingState === 'stable' && localStream) { // ensure localStream is still valid
                 console.log("useEffect [localStream]: Video track processed, pending offer detected, creating offer for room:", pendingOfferDetails.roomId);
                 createOffer(pendingOfferDetails.roomId, true); 
                 setPendingOfferDetails(null);
            }
        })
        .catch(e => console.error('Error replacing video track:', e));
    } else {
        console.warn("Video transceiver sender not found for track replacement.");
        // If no video transceiver, but audio might exist and an offer is pending
        if (!audioTransceiver && pendingOfferDetails && pc.signalingState === 'stable' && localStream) {
            console.log("useEffect [localStream]: No video transceiver, pending offer detected, creating offer for room:", pendingOfferDetails.roomId);
            createOffer(pendingOfferDetails.roomId, true);
            setPendingOfferDetails(null);
        }
    }

    if (audioTransceiver && audioTransceiver.sender) {
      audioTransceiver.sender.replaceTrack(audioTrack)
        .then(() => {
            console.log(`Audio track ${audioTrack ? 'set' : 'cleared'} on transceiver.`);
            audioReplaced = true;
            // Check for pending offer after audio track is (also) handled, 
            // but only if video didn't already trigger it or if video processing is separate
            // This logic can become complex if one track is ready before the other and we need both.
            // For simplicity, let's assume if pendingOfferDetails is still set, it means offer wasn't created.
            if (pendingOfferDetails && pc.signalingState === 'stable' && localStream) { 
                 console.log("useEffect [localStream]: Audio track processed, pending offer detected, creating offer for room:", pendingOfferDetails.roomId);
                 createOffer(pendingOfferDetails.roomId, true); 
                 setPendingOfferDetails(null); // Ensure it's cleared
            }
        })
        .catch(e => console.error('Error replacing audio track:', e));
    } else {
        console.warn("Audio transceiver sender not found for track replacement.");
        // If only video transceiver existed and was handled, and it didn't trigger the offer (e.g. pendingOfferDetails was null then)
        // but became non-null by the time we check here (less likely with current flow), or if no transceivers at all.
        if (!videoTransceiver && pendingOfferDetails && pc.signalingState === 'stable' && localStream) { // If no video and no audio transceiver
             console.log("useEffect [localStream]: No audio/video transceivers, pending offer detected, creating offer for room:", pendingOfferDetails.roomId);
            createOffer(pendingOfferDetails.roomId, true);
            setPendingOfferDetails(null);
        }
    }
    // Fallback: If localStream is present, but somehow transceivers weren't found (should not happen with addTransceiver)
    // or if pendingOfferDetails was set *after* replaceTrack promises resolved (unlikely).
    // if (localStream && pendingOfferDetails && pc.signalingState === 'stable' && !videoReplaced && !audioReplaced) {
    //     console.warn("useEffect [localStream]: localStream present, pending offer, but tracks may not have been applied. Attempting offer creation for room:", pendingOfferDetails.roomId);
    //     createOffer(pendingOfferDetails.roomId, true);
    //     setPendingOfferDetails(null);
    // }

  }, [localStream, pendingOfferDetails, createOffer]);

  // Separate useEffect for handling deferred offer creation once all conditions are met
  useEffect(() => {
    const pc = pcRef.current;
    // Ensure pc is defined and ready before checking its signalingState
    if (localStream && pendingOfferDetails && pc && pc.signalingState === 'stable') {
      console.log("useEffect [pendingOffer Trigger]: Conditions met (localStream, pendingOffer, PC stable). Creating deferred offer for room:", pendingOfferDetails.roomId);
      createOffer(pendingOfferDetails.roomId, true);
      setPendingOfferDetails(null); // Clear pending details immediately after initiating the deferred offer
    }
  }, [localStream, pendingOfferDetails, pcRef.current?.signalingState, createOffer, setPendingOfferDetails]); // Dependencies carefully chosen

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
                }
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
                setRemoteStream(null);

                setRoomId(event.roomId); 
                const pId = event.userId1 === user.id ? event.userId2 : event.userId1;
                setPartnerId(pId);
                setStatusMessage(`User ${pId} found. Connecting...`);
                
                // Always create or recreate PeerConnection on new match
                console.log("Match found: Setting up new PeerConnection for room:", event.roomId, "Caller has localStream:", !!localStream);
                let currentPC = setupPeerConnection(event.roomId); 
                
                if (!currentPC) { 
                     console.error("MATCH_FOUND_ERROR: setupPeerConnection returned null/undefined. Cannot proceed.");
                     sonnerToast.error("Connection setup error after match found.");
                     return;
                }
                console.log("Match found: PeerConnection setup initiated. PC instance from setup:", !!currentPC, "pcRef.current state:", pcRef.current?.signalingState, "Caller has localStream (at this point in match.found handler):", !!localStream);

                console.log(`Match found: My ID: ${user.id}, Partner ID: ${pId}, Am I offerer? ${user.id < pId}`);

                if (user.id < pId) {
                    console.log("Match found: This client (ID:",user.id,") is the offerer. Calling createOffer for room:", event.roomId);
                    createOffer(event.roomId); 
                } else {
                    console.log("Match found: This client (ID:",user.id,") will await offer. PC state:", currentPC.signalingState, "Does it have local stream?", !!localStream);
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
              onClick={roomId ? () => {/* handleHangUp(true) */} : () => {/* handleSearch() */}}
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
