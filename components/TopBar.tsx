
import React, { useState, useRef, useEffect } from 'react';
import { NavItem } from '../types';
import { ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';

interface TopBarProps {
  items: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onLayoutChange: (mode: 'side' | 'top') => void;
  layoutMode: 'side' | 'top';
  lastSynced?: Date | null;
  isSyncing?: boolean;
  onSync?: (loading: boolean) => void;
  hasError?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  items, 
  activeTab, 
  onTabChange, 
  onLayoutChange,
  layoutMode,
  lastSynced,
  isSyncing,
  onSync,
  hasError = false
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groupedItems = items.reduce((acc, item) => {
    const section = item.section || 'main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const toggleDropdown = (section: string) => {
    setOpenDropdown(openDropdown === section ? null : section);
  };

  const handleItemClick = (id: string) => {
    onTabChange(id);
    setOpenDropdown(null);
  };

  const isSectionActive = (section: string) => {
    if (!groupedItems[section]) return false;
    return groupedItems[section].some(item => item.id === activeTab);
  };

  return (
    <div className="w-full bg-white shadow-sm border-b border-gray-100 flex items-center justify-between px-2 md:px-4 py-2 flex-shrink-0 z-40 relative" ref={dropdownRef}>
      <div className="flex items-center space-x-4 flex-shrink-0">
         <a 
            href="https://bizskilledu.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 transition-opacity hover:opacity-80 group"
          >
             <img 
               src="https://i.ibb.co/YBSjM7Gg/Chat-GPT-Image-Dec-18-2025-10-23-18-AM.png" 
               className="h-8 w-8 object-contain" 
               alt="TaskPro Logo" 
             />
             <div className="flex flex-col justify-center">
                 <h1 className="text-xl font-bold text-indigo-600 leading-tight">TaskPro</h1>
                 <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-indigo-500">BIZSKILL</span>
             </div>
         </a>
         <span className="hidden lg:block h-8 w-px bg-gray-200 mx-2"></span>
      </div>

      <nav className="flex-1 ml-4 overflow-x-auto no-scrollbar md:overflow-visible">
        <ul className="flex items-center space-x-2 min-w-max md:min-w-0">
          {groupedItems['main']?.map(item => (
             <li key={item.id}>
              <button
                onClick={() => handleItemClick(item.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-semibold
                  ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'}`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}

          {['Tasks', 'Vendor', 'Master', 'Recurring Tasks'].map(section => groupedItems[section] && (
            <li key={section} className="relative">
              <button
                onClick={() => toggleDropdown(section)}
                className={`flex items-center space-x-1 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-semibold
                  ${isSectionActive(section) || openDropdown === section ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
              >
                <span>{section}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${openDropdown === section ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === section && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-blue-50 rounded-xl shadow-2xl border border-blue-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                   {groupedItems[section].map(item => (
                     <button
                       key={item.id}
                       onClick={() => handleItemClick(item.id)}
                       className={`w-full text-left px-5 py-3 text-sm flex items-center space-x-4 transition-colors duration-150
                         ${activeTab === item.id ? 'text-white bg-indigo-600' : 'text-indigo-700 hover:bg-blue-100 hover:text-indigo-900'}`}
                     >
                        <span className={`shrink-0 ${activeTab === item.id ? 'text-white' : 'text-indigo-500'}`}>{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                     </button>
                   ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center space-x-4 flex-shrink-0 ml-4">
        <div className="hidden xl:flex items-center space-x-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
          <div className="text-right">
             <div className={`text-[9px] uppercase font-bold tracking-widest leading-none ${hasError ? 'text-red-500' : 'text-indigo-500'}`}>
               DATABASE {hasError ? 'OFFLINE' : 'ONLINE'}
             </div>
             <div className="text-[10px] text-gray-500 font-medium leading-none mt-1">
                {isSyncing ? 'Syncing...' : lastSynced ? `Last: ${lastSynced.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Connected'}
             </div>
          </div>
          <button 
              onClick={() => onSync?.(false)} 
              disabled={isSyncing}
              className={`p-1.5 rounded-full transition-all ${isSyncing ? 'text-indigo-400 animate-spin' : hasError ? 'text-red-600' : 'text-indigo-600 hover:bg-white'}`}
            >
              <RefreshCw size={14} />
            </button>
        </div>

        <div className="relative group">
            <select
            value={layoutMode}
            onChange={(e) => onLayoutChange(e.target.value as 'side' | 'top')}
            className="appearance-none bg-indigo-600 border border-indigo-500 text-white text-xs font-bold rounded-lg block w-28 px-3 py-2.5 outline-none cursor-pointer shadow-sm hover:bg-indigo-700 transition-colors uppercase tracking-wider"
            >
            <option value="side">Side Menu</option>
            <option value="top">Top Menu</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-100">
                <ChevronDown size={12} />
            </div>
        </div>
      </div>
    </div>
  );
};
