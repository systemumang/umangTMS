import React, { useEffect, useState } from 'react';
import { NavItem } from '../types';
import { X, RefreshCw, AlertCircle, LogOut, ExternalLink, Layout, Monitor, ChevronDown, ChevronUp } from 'lucide-react';

interface SidebarProps {
  items: NavItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onLayoutChange: (mode: 'side' | 'top') => void;
  layoutMode: 'side' | 'top';
  isOpen?: boolean;
  onClose?: () => void;
  lastSynced?: Date | null;
  isSyncing?: boolean;
  onSync?: (loading: boolean) => void;
  className?: string;
  hasError?: boolean;
  onLogout?: () => void;
  onExitWorkspace?: () => void;
  workspaceId?: string;
}

const pendingChildIds = [
  'pending',
  'pending-client',
  'pending-owner',
  'pending-training',
  'pending-billing',
  'pending-payment'
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  items, 
  activeTab, 
  onTabChange, 
  onLayoutChange, 
  layoutMode,
  isOpen = false, 
  onClose,
  lastSynced,
  isSyncing,
  onSync,
  className = '',
  hasError = false,
  onLogout,
  onExitWorkspace,
  workspaceId
}) => {
  const [openPendingGroup, setOpenPendingGroup] = useState(false);

  useEffect(() => {
    if (pendingChildIds.includes(activeTab)) {
      setOpenPendingGroup(true);
    }
  }, [activeTab]);

  const groupedItems = items.reduce((acc, item) => {
    const section = item.section || 'main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const renderCount = (item: NavItem, active: boolean) => {
    if (typeof item.count !== 'number') return null;
    return (
      <span className={`min-w-[2rem] rounded-full px-2 py-0.5 text-center text-xs font-bold ${active ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700 group-hover:bg-white/20 group-hover:text-white'}`}>
        {item.count}
      </span>
    );
  };

  const NavButton = ({ item, isChild = false }: { item: NavItem; isChild?: boolean }) => {
    const isActive = activeTab === item.id;
    const hideOnMobile = item.id === 'add-multiple' || item.id === 'update-multiple';
    return (
      <button
        onClick={() => {
          onTabChange(item.id);
          if (window.innerWidth < 768 && onClose) onClose();
        }}
        className={`group w-full ${hideOnMobile ? 'hidden md:flex' : 'flex'} items-center gap-3 ${isChild ? 'pl-12 pr-4 py-2' : 'px-4 py-2.5'} rounded-md text-sm font-medium ml-2 border-l-2 
          ${isActive 
            ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm' 
            : 'border-transparent text-indigo-600 hover:bg-indigo-600 hover:text-white'
          }`}
      >
        {!isChild && (
          <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-indigo-600 group-hover:text-white'}`}>
            {item.icon}
          </span>
        )}
        <span className="text-left leading-tight flex-1">{item.label}</span>
        {renderCount(item, isActive)}
      </button>
    );
  };

  const renderTasksSection = () => {
    const taskItems = groupedItems['Tasks'] || [];
    const itemMap = new Map(taskItems.map(item => [item.id, item]));
    const topLevelItems = taskItems.filter(item => !pendingChildIds.includes(item.id));
    const pendingGroupItem = itemMap.get('pending-group');
    const isPendingGroupActive = pendingChildIds.includes(activeTab);

    return topLevelItems.map(item => {
      if (item.id !== 'pending-group') {
        return <li key={item.id}><NavButton item={item} /></li>;
      }

      if (!pendingGroupItem) return null;

      return (
        <li key={item.id}>
          <button
            onClick={() => setOpenPendingGroup(prev => !prev)}
            className={`group w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium ml-2 border-l-2 ${isPendingGroupActive || openPendingGroup ? 'bg-red-600 border-red-700 text-white shadow-sm' : 'border-transparent text-red-700 bg-red-50 hover:bg-red-600 hover:text-white'}`}
          >
            <span className={`flex-shrink-0 ${isPendingGroupActive || openPendingGroup ? 'text-white' : 'text-red-500 group-hover:text-white'}`}>
              {pendingGroupItem.icon}
            </span>
            <span className="text-left leading-tight flex-1">{pendingGroupItem.label}</span>
            <div className="flex items-center gap-2 shrink-0">
              {renderCount(pendingGroupItem, isPendingGroupActive || openPendingGroup)}
              {openPendingGroup ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>
          {openPendingGroup && (
            <ul className="mt-1 space-y-1">
              {pendingChildIds.map(id => {
                const childItem = itemMap.get(id);
                return childItem ? <li key={childItem.id}><NavButton item={childItem} isChild={true} /></li> : null;
              })}
            </ul>
          )}
        </li>
      );
    });
  };

  return (
    <>
      <aside className={`
        w-64 bg-blue-50 h-full shadow-lg flex flex-col flex-shrink-0 z-50 border-r border-blue-100
        fixed md:relative inset-y-0 left-0 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${className}
      `}>
        <div className="p-4 border-b-2 border-indigo-500 flex flex-col bg-white/40">
          <div className="flex justify-between items-center w-full">
            <a 
              href="https://bizskilledu.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 w-full overflow-hidden group hover:opacity-80"
            >
              <img 
                src="https://i.ibb.co/YBSjM7Gg/Chat-GPT-Image-Dec-18-2025-10-23-18-AM.png" 
                className="h-10 w-10 object-contain flex-shrink-0" 
                alt="TaskPro Logo" 
              />
              <div className="flex flex-col min-w-0">
                <h1 className="text-xl font-bold text-indigo-600 truncate">TaskPro</h1>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest group-hover:text-indigo-500">BIZSKILL</span>
              </div>
            </a>
            <button 
              onClick={onClose} 
              className="md:hidden p-2 text-gray-500 hover:bg-blue-100 rounded-full flex-shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {groupedItems['main'] && (
             <ul className="space-y-1 px-3 mb-4">
               {groupedItems['main'].map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onTabChange(item.id);
                        if (window.innerWidth < 768 && onClose) onClose();
                      }}
                      className={`group w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium
                        ${activeTab === item.id 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'text-indigo-600 hover:bg-indigo-600 hover:text-white'
                        }`}
                    >
                      <span className={`${activeTab === item.id ? 'text-white' : 'text-indigo-600 group-hover:text-white'}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {renderCount(item, activeTab === item.id)}
                    </button>
                  </li>
               ))}
             </ul>
          )}

          {['Tasks', 'Vendor', 'Master', 'Recurring Tasks'].map(section => groupedItems[section] && (
            <div key={section} className="mb-2 px-3">
               <div className="w-full px-4 py-2 mb-1">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{section}</span>
               </div>
               <ul className="space-y-1">
                 {section === 'Tasks'
                   ? renderTasksSection()
                   : groupedItems[section].map(item => <li key={item.id}><NavButton item={item} /></li>)}
               </ul>
               <div className="mx-4 my-2 border-b border-indigo-200"></div>
            </div>
          ))}
        </nav>

        <div className="hidden md:block p-4 bg-white/50 border-t-2 border-indigo-500 space-y-3">
          <div className="flex flex-col gap-2 p-1">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest px-1">Layout Mode</span>
            <div className="flex bg-indigo-100/50 p-1 rounded-lg border border-indigo-200">
              <button 
                onClick={() => onLayoutChange('side')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold rounded-md ${layoutMode === 'side' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-400 hover:text-indigo-600'}`}
              >
                <Layout size={12} />
                SIDE
              </button>
              <button 
                onClick={() => onLayoutChange('top')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold rounded-md ${layoutMode === 'top' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-400 hover:text-indigo-600'}`}
              >
                <Monitor size={12} />
                TOP
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${hasError ? 'text-red-500' : 'text-indigo-600'}`}>
                <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                {hasError ? 'Connection Lost' : 'Database Status'}
              </span>
              <span className={`text-[11px] italic ${hasError ? 'text-red-600 font-medium' : 'text-indigo-600 font-medium'}`}>
                {isSyncing ? 'Syncing...' : hasError ? 'Reconnecting...' : lastSynced ? `Synced: ${lastSynced.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Connected'}
              </span>
            </div>
            <button 
              onClick={() => onSync?.(false)} 
              disabled={isSyncing}
              className={`p-1.5 rounded-full ${isSyncing ? 'text-indigo-400 animate-spin' : hasError ? 'text-red-500 hover:bg-red-50' : 'text-indigo-600 hover:bg-indigo-100'}`}
              title="Sync now"
            >
              {hasError ? <AlertCircle size={16} /> : <RefreshCw size={16} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={onLogout} className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50">
              <LogOut size={14} />
              Logout
            </button>
            <button onClick={onExitWorkspace} className="flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50">
              <ExternalLink size={14} />
              Exit
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

