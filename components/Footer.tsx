
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-10 bg-[#1e3a8a] flex flex-col items-center justify-center space-y-3 w-full">
      <div className="bg-white p-0 rounded shadow-md overflow-hidden">
        <div className="bg-black px-4 py-1 text-white text-xs font-black tracking-widest text-center border-b border-white/20">
          BIZ
        </div>
        <div className="bg-white px-4 py-1 text-black text-sm font-black tracking-[0.3em] text-center">
          SKILL
        </div>
      </div>
      <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.5em]">
        Powered by BizSkill
      </p>
    </footer>
  );
};
