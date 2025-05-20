import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SIGNALING_URL = 'http://localhost:5000';

export interface UseSignalingProps {
  gender: 'male' | 'female';
  isPremium: boolean;
  userId: number | string;
  onMatchFound: (partnerId: string) => void;
  onSignal: (from: string, data: any) => void;
  onPartnerDisconnected: () => void;
  onPartnerLeft: () => void;
}

export function useSignaling({
  gender,
  isPremium,
  userId,
  onMatchFound,
  onSignal,
  onPartnerDisconnected,
  onPartnerLeft,
}: UseSignalingProps) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SIGNALING_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Входим в очередь сразу после подключения
      socket.emit('join_queue', { gender, isPremium, userId });
    });

    socket.on('match_found', ({ partnerId }) => {
      onMatchFound(partnerId);
    });

    socket.on('signal', ({ from, data }) => {
      onSignal(from, data);
    });

    socket.on('partner_disconnected', () => {
      onPartnerDisconnected();
    });

    socket.on('partner_left', () => {
      onPartnerLeft();
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line
  }, [gender, isPremium, userId]);

  // Функция для отправки signaling-сообщений
  const sendSignal = (to: string, data: any) => {
    socketRef.current?.emit('signal', { to, data });
  };

  // Выйти из чата (разорвать пару)
  const leaveChat = () => {
    socketRef.current?.emit('leave_chat');
  };

  return { sendSignal, leaveChat, socket: socketRef.current };
}