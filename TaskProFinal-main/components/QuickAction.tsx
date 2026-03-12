import React from 'react';
import { QuickActionProps } from '../types';

export const QuickAction: React.FC<QuickActionProps> = ({ label, icon, colorClass, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`${colorClass} flex items-center justify-center space-x-2 py-3 px-4 rounded-md shadow-sm transition-all hover:shadow-md font-bold text-sm border-2 border-blue-600 outline-none`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
};