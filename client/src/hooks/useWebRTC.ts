import { useState, useEffect, useRef, useCallback } from 'react';
import echo from '../lib/echo'; // Наш настроенный Echo
import apiService from '../services/apiService'; // Наш apiService
// import { useAuth } from '../contexts/AuthContext'; // Если используем для получения ID текущего пользователя

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  incomingCall: { fromUserId: number; offer: RTCSessionDescriptionInit } | null;
  availableVideoDevices: MediaDeviceInfo[];
  selectedVideoDeviceId: string | null;
  // ... другие состояния по необходимости
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  // Добавь TURN серверы для более надежного соединения через NAT/Firewall, если необходимо
];

const LOCAL_STORAGE_CAMERA_ID_KEY = 'selectedCameraId';

export const useWebRTC = (currentUserId: number | null) => {
  const [webRTCState, setWebRTCState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isCallActive: false,
    incomingCall: null,
    availableVideoDevices: [],
    selectedVideoDeviceId: localStorage.getItem(LOCAL_STORAGE_CAMERA_ID_KEY),
  });
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const peerConnectionPartnerId = useRef<number | null>(null); // ID собеседника

  const getVideoDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setWebRTCState(prev => ({ ...prev, availableVideoDevices: videoDevices }));
      if (videoDevices.length > 0 && !webRTCState.selectedVideoDeviceId) {
        // Если ID не выбран, но камеры есть, выбираем первую и сохраняем
        const defaultDeviceId = videoDevices[0].deviceId;
        localStorage.setItem(LOCAL_STORAGE_CAMERA_ID_KEY, defaultDeviceId);
        setWebRTCState(prev => ({ ...prev, selectedVideoDeviceId: defaultDeviceId }));
      }
      return videoDevices;
    } catch (error) {
      console.error("Error enumerating video devices:", error);
      setWebRTCState(prev => ({ ...prev, availableVideoDevices: [] }));
      return [];
    }
  }, [webRTCState.selectedVideoDeviceId]);

  useEffect(() => {
    getVideoDevices(); // Получаем список камер при инициализации

    navigator.mediaDevices.addEventListener('devicechange', getVideoDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getVideoDevices);
    };
  }, [getVideoDevices]);

  // 1. Инициализация локального медиапотока
  const initializeLocalStream = useCallback(async (deviceId?: string) => {
    // Останавливаем предыдущий стрим, если он был
    if (webRTCState.localStream) {
        webRTCState.localStream.getTracks().forEach(track => track.stop());
    }

    const targetDeviceId = deviceId || webRTCState.selectedVideoDeviceId;
    console.log('Attempting to initialize local stream with deviceId:', targetDeviceId);

    const constraints: MediaStreamConstraints = {
        audio: true, // Можно добавить выбор аудиоустройств позже
        video: targetDeviceId ? { deviceId: { exact: targetDeviceId } } : true,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setWebRTCState(prev => ({ ...prev, localStream: stream, selectedVideoDeviceId: targetDeviceId || prev.selectedVideoDeviceId }));
      if (targetDeviceId) {
        localStorage.setItem(LOCAL_STORAGE_CAMERA_ID_KEY, targetDeviceId);
      }
      
      // Если есть активное peer connection, нужно обновить треки
      if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
                await sender.replaceTrack(videoTrack);
                console.log('Replaced video track in existing PeerConnection');
            } else {
                peerConnection.current.addTrack(videoTrack, stream);
                console.log('Added new video track to existing PeerConnection');
            }
        }
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices with deviceId:", targetDeviceId, error);
      // Если не удалось с конкретным ID, пытаемся с дефолтным (без deviceId)
      if (targetDeviceId) {
        console.warn('Failed with specific deviceId, trying default...');
        localStorage.removeItem(LOCAL_STORAGE_CAMERA_ID_KEY); // Сбрасываем неработающий ID
        setWebRTCState(prev => ({...prev, selectedVideoDeviceId: null}));
        return initializeLocalStream(); // Рекурсивный вызов для попытки с дефолтной камерой
      }
      setWebRTCState(prev => ({ ...prev, localStream: null }));
      return null;
    }
  }, [webRTCState.selectedVideoDeviceId, webRTCState.localStream]);

  // 2. Создание и настройка RTCPeerConnection
  const createPeerConnection = useCallback((partnerId: number): RTCPeerConnection => {
    console.log('Creating new PeerConnection for partner:', partnerId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = event => {
      if (event.candidate && currentUserId) {
        console.log('Sending ICE candidate to', partnerId, ':', event.candidate);
        apiService.post(`/video/ice-candidate/${partnerId}`, { candidate: event.candidate })
          .catch(err => console.error("Error sending ICE candidate", err));
      }
    };

    pc.ontrack = event => {
      console.log('Remote track received:', event.streams[0]);
      setWebRTCState(prev => ({ ...prev, remoteStream: event.streams[0] }));
    };
    
    // Локальные треки будут добавлены в startCall или acceptIncomingCall
    // после того как localStream гарантированно будет доступен.
    // webRTCState.localStream?.getTracks().forEach(track => {
    //     pc.addTrack(track, webRTCState.localStream!);
    // });

    peerConnection.current = pc;
    peerConnectionPartnerId.current = partnerId;
    return pc;
  }, [currentUserId]);

  const hangUp = useCallback((notifyPeer = true) => {
    console.log('Hanging up call.');
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (notifyPeer && peerConnectionPartnerId.current && currentUserId) {
      console.log('Notifying peer', peerConnectionPartnerId.current, 'about call end');
      apiService.post(`/video/end-call/${peerConnectionPartnerId.current}`)
          .catch(err => console.error("Error sending end-call notification", err));
    }
    
    // Останавливаем локальный стрим, если он был активен и мы его создали
    // webRTCState.localStream?.getTracks().forEach(track => track.stop());

    setWebRTCState(prev => ({
      ...prev,
      // localStream: null, // Решаем, нужно ли сбрасывать локальный стрим. Может, пользователь захочет его видеть.
      remoteStream: null,
      isCallActive: false,
      incomingCall: null,
    }));
    peerConnectionPartnerId.current = null;
  }, [currentUserId /*, webRTCState.localStream */]); // hangUp используется в useEffect, поэтому currentUserId важен

  // useEffect для Echo должен идти после определения всех функций, которые он может вызывать в cleanup
  useEffect(() => {
    if (!currentUserId || !echo) return;

    const channelName = `private-video-chat.${currentUserId}`;
    const privateChannel = echo.private(channelName);

    console.log(`Subscribing to ${channelName}`);

    privateChannel
      .listen('.new-user-joined', async (data: { offer: RTCSessionDescriptionInit, fromUserId: number }) => {
        console.log('Received offer from', data.fromUserId, data);
        if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
            console.warn('PeerConnection already exists or call is active, ignoring new offer for now.');
            return;
        }
        setWebRTCState(prev => ({ ...prev, incomingCall: { fromUserId: data.fromUserId, offer: data.offer } }));
      })
      .listen('.answer-made', async (data: { answer: RTCSessionDescriptionInit, fromUserId: number }) => {
        console.log('Received answer from', data.fromUserId, data);
        if (peerConnection.current && data.fromUserId === peerConnectionPartnerId.current) {
          try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log('Remote description set (answer)');
            setWebRTCState(prev => ({...prev, isCallActive: true }));
          } catch (error) {
            console.error('Error setting remote description (answer):', error);
          }
        } else {
            console.warn('Received answer but no matching peer connection or wrong partner ID.');
        }
      })
      .listen('.ice-candidate-sent', async (data: { candidate: RTCIceCandidateInit, fromUserId: number }) => {
        console.log('Received ICE candidate from', data.fromUserId, data);
        if (peerConnection.current && data.candidate && data.fromUserId === peerConnectionPartnerId.current) {
          try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            console.log('ICE candidate added');
          } catch (error) {
            console.error('Error adding received ICE candidate:', error);
          }
        } else {
             console.warn('Received ICE candidate but no matching peer connection or wrong partner ID.');
        }
      })
      .listen('.call-ended', (data: { fromUserId: number }) => {
        console.log('Received call ended from', data.fromUserId);
        if (data.fromUserId === peerConnectionPartnerId.current) {
          hangUp(false);
        }
      })
      .subscribed(() => console.log(`Successfully subscribed to ${channelName}!`))
      .error((error: any) => console.error(`Subscription error for ${channelName}:`, error));

    return () => {
      console.log(`Leaving channel ${channelName}`);
      echo.leave(channelName);
      // Важно: не вызываем hangUp здесь напрямую, чтобы избежать циклов или неожиданного поведения при смене currentUserId.
      // Очистка peerConnection должна происходить либо при явном hangUp, либо при размонтировании VideoChat компонента.
    };
  }, [currentUserId]); // Убираем hangUp из зависимостей, оставляем только currentUserId
                             // hangUp вызывается внутри, но он useCallback и его зависимости (currentUserId) уже покрыты.

  // 4. Функции управления звонком
  const startCall = useCallback(async (targetUserId: number) => {
    let currentLocalStream = webRTCState.localStream;
    if (!currentLocalStream) {
      console.error("Local stream not available to start call.");
      currentLocalStream = await initializeLocalStream();
      if (!currentLocalStream) return;
      await new Promise(resolve => setTimeout(resolve, 100)); // Дать время на обновление state
    }
    if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
        console.warn('Call already in progress or peer connection exists.');
        return;
    }

    console.log('Starting call to user', targetUserId);
    const pc = createPeerConnection(targetUserId);
    
    currentLocalStream?.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track === track);
        if (!sender) {
            pc.addTrack(track, currentLocalStream!);
        }
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Offer created and local description set:', offer);
      await apiService.post(`/video/offer/${targetUserId}`, { offer });
    } catch (error) {
      console.error('Error creating or sending offer:', error);
    }
  }, [webRTCState.localStream, createPeerConnection, initializeLocalStream]);

  const acceptIncomingCall = useCallback(async () => {
    if (!webRTCState.incomingCall || !currentUserId) return;
    let currentLocalStream = webRTCState.localStream;
    if (!currentLocalStream) {
        console.error("Local stream not available to accept call.");
        currentLocalStream = await initializeLocalStream();
        if (!currentLocalStream) return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
        console.warn('Call already in progress or peer connection exists.');
        return;
    }

    const { fromUserId, offer } = webRTCState.incomingCall;
    console.log('Accepting call from user', fromUserId);
    const pc = createPeerConnection(fromUserId);

    currentLocalStream?.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track === track);
        if (!sender) {
            pc.addTrack(track, currentLocalStream!);
        }
    });

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Remote description set (offer)');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('Answer created and local description set:', answer);
      await apiService.post(`/video/answer/${fromUserId}`, { answer });
      setWebRTCState(prev => ({ ...prev, isCallActive: true, incomingCall: null }));
    } catch (error) {
      console.error('Error accepting call or sending answer:', error);
    }
  }, [webRTCState.incomingCall, webRTCState.localStream, currentUserId, createPeerConnection, initializeLocalStream]);
  
  const rejectIncomingCall = useCallback(() => {
    if (webRTCState.incomingCall) {
        // Можно отправить уведомление об отклонении, если нужно (через API/Echo)
        console.log('Rejecting call from', webRTCState.incomingCall.fromUserId);
        // Например: apiService.post(`/video/reject-call/${webRTCState.incomingCall.fromUserId}`);
        setWebRTCState(prev => ({ ...prev, incomingCall: null }));
    }
  }, [webRTCState.incomingCall]);

  useEffect(() => {
    // Этот useEffect отвечает за инициализацию локального стрима при монтировании
    // и должен выполниться только один раз или при изменении initializeLocalStream (что маловероятно)
    if (!webRTCState.localStream) { // Добавил проверку, чтобы не перезапрашивать, если уже есть
        initializeLocalStream();
    }
  }, [initializeLocalStream, webRTCState.localStream]);

  return {
    ...webRTCState,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    hangUp,
    initializeLocalStream, // Экспортируем, чтобы VideoChat мог вызвать при необходимости
  };
}; 