import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from 'react-i18next';

interface GenderVerificationProps {
  stream: MediaStream | null;
  onGenderVerified: (gender: 'male' | 'female') => void;
}

// This is a simplified version of what would be a real AI-based gender detection
// In a real implementation, this would use a proper ML model via the browser or API
const GenderVerification = ({ stream, onGenderVerified }: GenderVerificationProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startVerification = () => {
    if (!stream) {
      toast({
        variant: "destructive",
        title: t('genderVerification.cameraRequiredTitle'),
        description: t('genderVerification.cameraRequiredDesc'),
      });
      return;
    }

    setIsVerifying(true);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          completeVerification();
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const completeVerification = () => {
    // In a real app, this would use actual AI face detection
    // Here we'll randomly assign a gender for demo purposes
    const randomGender = Math.random() > 0.5 ? 'male' : 'female';
    
    setTimeout(() => {
      setIsVerifying(false);
      toast({
        title: t('genderVerification.verificationCompleteTitle'),
        description: t('genderVerification.verificationCompleteDesc', { gender: randomGender }),
      });
      onGenderVerified(randomGender as 'male' | 'female');
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-black/80 rounded-lg border border-rulet-purple/30 max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-white mb-4">{t('genderVerification.title')}</h2>
      <p className="text-gray-300 text-center mb-6">
        {t('genderVerification.desc')}
      </p>

      <div className="relative w-64 h-64 rounded-lg overflow-hidden border-2 border-rulet-purple/50 mb-6">
        {stream ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <p className="text-gray-400">{t('genderVerification.cameraNotAvailable')}</p>
          </div>
        )}
        
        {isVerifying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rulet-purple mb-2"></div>
              <p className="text-white">{t('genderVerification.verifying', { progress })}</p>
            </div>
          </div>
        )}
      </div>

      {!isVerifying ? (
        <Button
          onClick={startVerification}
          className="bg-rulet-purple hover:bg-rulet-purple-dark text-white"
          disabled={!stream}
        >
          {t('genderVerification.startButton')}
        </Button>
      ) : (
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
          <div className="bg-rulet-purple h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      )}
      
      <p className="text-xs text-gray-400 mt-4 text-center">
        {t('genderVerification.aiNote')}
      </p>
    </div>
  );
};

export default GenderVerification;
