
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number; // Height in pixels
  showText?: boolean;
  animate?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 250, showText = false, animate = false }) => {
  const logoUrl = "https://raw.githubusercontent.com/Dessouky13/Game-ai/main/Code_Generated_Image.png";
  
  // Scale factor to make the logo appear larger within the container by cropping frame padding
  const scaleFactor = 1.35;
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative group flex items-center justify-center ${animate ? 'animate-bounce-slow' : ''}`}>
        {/* Ambient Glow Background - More subtle but deep */}
        <div className="absolute -inset-16 bg-primary/10 rounded-full blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
        <div className="absolute -inset-10 bg-gradient-to-tr from-primary/20 to-indigo-500/20 rounded-full blur-[60px] animate-pulse"></div>
        
        {/* Container with overflow-hidden to crop the frame padding */}
        <div 
          className="relative overflow-hidden flex items-center justify-center"
          style={{ height: size, width: size }}
        >
          <img 
            src={logoUrl} 
            alt="Seekers AI Logo" 
            style={{ 
              height: size * scaleFactor, 
              width: size * scaleFactor,
              objectFit: 'cover',
              objectPosition: 'center'
            }}
            className="drop-shadow-[0_25px_60px_rgba(161,158,255,0.6)] transition-all duration-700 hover:scale-110 active:scale-95 cursor-pointer"
          />
        </div>
      </div>
      {showText && (
        <span className="font-black text-4xl tracking-tighter text-slate-900 dark:text-white uppercase drop-shadow-md -mt-4 relative z-10">
          Seekers AI
        </span>
      )}
    </div>
  );
};

export default Logo;
