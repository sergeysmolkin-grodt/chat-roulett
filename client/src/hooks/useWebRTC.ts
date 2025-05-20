import { useState, useEffect, useRef, useCallback } from 'react';
import echo from '../lib/echo'; // Наш настроенный Echo
import apiService from '../services/apiService'; // Наш apiService
// import { useAuth } from '../contexts/AuthContext'; // Если используем для получения ID текущего пользователя

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  incomingCall: { fromUserId: number; offer: RTCSessionDescriptionInit } | null;
  // ... другие состояния по необходимости
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  // Добавь TURN серверы для более надежного соединения через NAT/Firewall, если необходимо
];

export const useWebRTC = (currentUserId: number | null) => {
  const [webRTCState, setWebRTCState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    isCallActive: false,
    incomingCall: null,
  });
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const peerConnectionPartnerId = useRef<number | null>(null); // ID собеседника

  // 1. Инициализация локального медиапотока
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setWebRTCState(prev => ({ ...prev, localStream: stream }));
      return stream;
    } catch (error) {
      console.error("Error accessing media devices.", error);
      // Обработай ошибку (например, нет камеры/микрофона, пользователь не дал доступ)
      return null;
    }
  }, []);

  // 2. Создание и настройка RTCPeerConnection
  const createPeerConnection = useCallback((partnerId: number): RTCPeerConnection => {
    console.log('Creating new PeerConnection for partner:', partnerId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = event => {
      if (event.candidate && currentUserId) {
        console.log('Sending ICE candidate to', partnerId, ':', event.candidate);
        apiService.post(`/video/ice-candidate/${partnerId}`, {
          candidate: event.candidate,
          // fromUserId: currentUserId, // на бэке fromUserId берется из Auth::id()
        }).catch(err => console.error("Error sending ICE candidate", err));
      }
    };

    pc.ontrack = event => {
      console.log('Remote track received:', event.streams[0]);
      setWebRTCState(prev => ({ ...prev, remoteStream: event.streams[0] }));
    };
    
    // Добавляем локальные треки в соединение, если локальный стрим уже есть
    webRTCState.localStream?.getTracks().forEach(track => {
        pc.addTrack(track, webRTCState.localStream!);
    });

    peerConnection.current = pc;
    peerConnectionPartnerId.current = partnerId;
    return pc;
  }, [currentUserId, webRTCState.localStream]);


  // 3. Логика обработки сигналов от Echo
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
            // Можно реализовать логику отклонения или уведомления о втором звонке
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
          hangUp(false); // Не отправлять уведомление, так как мы его получили
        }
      })
      .subscribed(() => console.log(`Successfully subscribed to ${channelName}!`))
      .error((error: any) => console.error(`Subscription error for ${channelName}:`, error));

    return () => {
      console.log(`Leaving channel ${channelName}`);
      echo.leave(channelName);
      hangUp(false); // Завершаем звонок при размонтировании компонента или смене пользователя
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, createPeerConnection]); // Добавил createPeerConnection в зависимости, hangUp опосредованно используется

  // 4. Функции управления звонком
  const startCall = useCallback(async (targetUserId: number) => {
    if (!webRTCState.localStream) {
      console.error("Local stream not available to start call.");
      // Попытка инициализировать стрим, если его нет
      const stream = await initializeLocalStream();
      if (!stream) return; // Если не удалось получить стрим, выйти
       // Дать время на обновление state webRTCState.localStream перед созданием PC
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
        console.warn('Call already in progress or peer connection exists.');
        return;
    }

    console.log('Starting call to user', targetUserId);
    const pc = createPeerConnection(targetUserId);
    
    // Добавляем треки, если они не были добавлены при создании pc (на случай если localStream появился позже)
    webRTCState.localStream?.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track === track);
        if (!sender) {
            pc.addTrack(track, webRTCState.localStream!);
        }
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Offer created and local description set:', offer);
      await apiService.post(`/video/offer/${targetUserId}`, { offer });
      // fromUserId на бэке берется из Auth::id()
    } catch (error) {
      console.error('Error creating or sending offer:', error);
    }
  }, [webRTCState.localStream, createPeerConnection, initializeLocalStream]);

  const acceptIncomingCall = useCallback(async () => {
    if (!webRTCState.incomingCall || !currentUserId) return;
    if (!webRTCState.localStream) {
        console.error("Local stream not available to accept call.");
        const stream = await initializeLocalStream();
        if (!stream) return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
     if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
        console.warn('Call already in progress or peer connection exists.');
        return;
    }


    const { fromUserId, offer } = webRTCState.incomingCall;
    console.log('Accepting call from user', fromUserId);
    const pc = createPeerConnection(fromUserId);

    webRTCState.localStream?.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track === track);
        if (!sender) {
            pc.addTrack(track, webRTCState.localStream!);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId /*, webRTCState.localStream */]); // hangUp используется в useEffect, поэтому currentUserId важен


  // Инициализация при монтировании
  useEffect(() => {
    initializeLocalStream();
  }, [initializeLocalStream]);


  return {
    ...webRTCState,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    hangUp,
    initializeLocalStream, // Экспортируем, если нужно вызвать явно из UI
  };
}; 