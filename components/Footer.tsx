import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-6 border-t border-blue-800 bg-blue-900 flex flex-col items-center justify-center">
      <a 
        href="https://ibb.co/twryT1Cq" 
        target="_blank" 
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-80"
      >
        <img 
          src="https://i.ibb.co/spYLdX3K/BIZSKILL-LOGO.png" 
          alt="BIZSKILL-LOGO" 
          className="h-14 w-auto object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </a>
      <p className="mt-2 text-[10px] text-blue-300 font-bold uppercase tracking-[0.2em]">
        Powered by BizSkill
      </p>
    </footer>
  );
};