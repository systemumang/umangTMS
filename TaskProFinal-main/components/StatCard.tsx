import React from 'react';
import { StatCardProps } from '../types';

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBgColor, iconColor, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-3 rounded-lg shadow-sm border-2 border-blue-400 flex items-center justify-between transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-600 duration-200 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div>
        <h4 className="text-blue-700 text-xs font-bold uppercase tracking-wider mb-0.5">{title}</h4>
        <span className="text-xl font-bold text-black">{value}</span>
      </div>
      <div className={`p-1.5 rounded-full ${iconBgColor} ${iconColor}`}>
        {icon}
      </div>
    </div>
  );
};