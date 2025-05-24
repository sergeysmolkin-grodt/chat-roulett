import React from 'react';

const Logo = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-16 h-16 relative mb-0">
        <svg
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-full h-full"
        >
          <path d="M20.571 5.656a1.002 1.002 0 0 0-1.084.229l-2.428 2.428V7a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-1.313l2.428 2.428a.998.998 0 0 0 1.613-.327.998.998 0 0 0-.101-.756l-2.999-2.999A.996.996 0 0 0 17 12.5V12c0-.073.008-.146.024-.217a.998.998 0 0 0 .05-.211l2.999-2.999a1 1 0 0 0 .5-1.917zm-4.093 6.634a.996.996 0 0 0 0 .001.998.998 0 0 0 0 .001zM16 12a.998.998 0 0 0 0-.001zM5 6h9a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm12.5 4.586L16 12.086V12.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v.414l1.5-1.5V10a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-.414z"/>
        </svg>
      </div>
    </div>
  );
};

export default Logo;
