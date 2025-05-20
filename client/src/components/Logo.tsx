
import React from 'react';

const Logo = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-16 h-16 relative mb-2">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M50 15C40 15 30 20 25 30L15 50L25 70C30 80 40 85 50 85C60 85 70 80 75 70L85 50L75 30C70 20 60 15 50 15Z"
            stroke="white"
            strokeWidth="3"
            fill="transparent"
          />
          <path
            d="M35 40L30 35M65 40L70 35M35 60L30 65M65 60L70 65"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="5" fill="white" />
        </svg>
      </div>
      <div className="text-white text-lg font-bold tracking-wider">RULET.TV</div>
    </div>
  );
};

export default Logo;
