import React, { useEffect, useRef, useState } from 'react';

const VideoChat = () => {
  const localVideoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing media devices.", err);
        setError("Не удалось получить доступ к камере или микрофону. Проверьте разрешения в браузере.");
      }
    };

    getMedia();

    // Очистка при размонтировании компонента
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Видеочат</h2>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <h3>Вы</h3>
          <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '300px', border: '1px solid black' }} />
        </div>
        {/* 
          Место для видео собеседника (пока заглушка)
          <div>
            <h3>Собеседник</h3>
            <video id="remoteVideo" autoPlay playsInline style={{ width: '300px', border: '1px solid black' }} />
          </div> 
        */}
      </div>
      {/* TODO: Добавить кнопки управления (старт/стоп, следующий и т.д.) */}
    </div>
  );
};

export default VideoChat; 