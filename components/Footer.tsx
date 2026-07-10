import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-10 bg-[#1e3a8a] flex flex-col items-center justify-center w-full">
      <a 
        href="https://bizskilledu.com/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex flex-col items-center group transition-all hover:scale-105 active:scale-95"
      >
        <img 
          src="/taskpro-logo.svg"
          width="56"
          height="56"
          className="h-14 w-14 object-contain mb-4"
          alt="BizSkill Logo" 
        />
        <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.5em] group-hover:text-white transition-colors">
          Powered by BizSkill
        </p>
      </a>
    </footer>
  );
};