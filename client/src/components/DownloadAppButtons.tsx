
import React from 'react';

const DownloadAppButtons = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 md:space-y-0 md:flex-row md:space-x-4">
      <a href="#" className="inline-block">
        <img 
          src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
          alt="Get it on Google Play" 
          className="h-16"
        />
      </a>
      <a href="#" className="inline-block">
        <img 
          src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" 
          alt="Download on the App Store" 
          className="h-12"
        />
      </a>
    </div>
  );
};

export default DownloadAppButtons;
