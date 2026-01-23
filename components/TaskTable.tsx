
import React, { useMemo, useState } from 'react';
import { Task, Project, User as UserType } from '../types';
import { Edit2, Info, Calendar, Clock, User, Users, Briefcase, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Trash2, Tag, Layout, Building2, Layers, AlertTriangle, ChevronDown, ChevronUp, Hammer } from 'lucide-react';
import { formatToIndianDate } from '../App';

interface TaskTableProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: number, isVendor: boolean) => void;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onViewHistory: (task: Task) => void;
  showSelection?: boolean;
  isVendorView?: boolean;
  viewMode?: 'card' | 'table';
  projects?: Project[];
  syncingIds?: Set<number>;
  currentUser?: UserType | null;
  sortKey: keyof Task;
  sortDir: 'asc' | 'desc';
  onSort: (key: keyof Task, dir: 'asc' | 'desc') => void;
  startIndex: number;
}

export const TaskTable: React.FC<TaskTableProps> = ({ 
  tasks, 
  onUpdateTask, 
  onEditTask,
  onDeleteTask,
  selectedIds, 
  onSelectionChange, 
  onViewHistory,
  showSelection = false,
  isVendorView = false,
  viewMode = 'card',
  projects = [],
  syncingIds = new Set(),
  currentUser,
  sortKey,
  sortDir,
  onSort,
  startIndex
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedIds(newExpanded);
  };

  const requestSort = (key: keyof Task) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortKey === key && sortDir === 'asc') {
      direction = 'desc';
    }
    onSort(key, direction);
  };

  const getSortIcon = (key: keyof Task) => {
    if (sortKey !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortDir === 'asc' ? <ArrowUp size={14} className="ml-1 text-white" /> : <ArrowDown size={14} className="ml-1 text-white" />;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) onSelectionChange(tasks.map(t => t.id));
    else onSelectionChange([]);
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter(i => i !== id));
    else onSelectionChange([...selectedIds, id]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      case 'Started': return 'bg-blue-50 text-blue-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateStr: string) => {
    return formatToIndianDate(dateStr);
  };

  const thClass = "px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-600 last:border-r-0 cursor-pointer hover:bg-blue-800 transition-colors select-none whitespace-normal";
  const tdClass = "px-4 py-3 text-sm text-black border-r border-gray-200 last:border-r-0 align-top whitespace-normal break-words";

  return (
    <>
      <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${viewMode === 'card' ? 'hidden md:block' : 'block'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-700 border-b border-blue-800">
                {showSelection && (
                  <th className="px-4 py-3 w-10 text-center border-r border-blue-600">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 h-4 w-4" 
                      checked={tasks.length > 0 && selectedIds.length === tasks.length} 
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-600 w-12 text-center">S.No.</th>
                <th className={thClass} onClick={() => requestSort('date')}><div className="flex items-center">Date {getSortIcon('date')}</div></th>
                <th className={thClass} onClick={() => requestSort('title')}><div className="flex items-center">Task {getSortIcon('title')}</div></th>
                <th className={thClass} onClick={() => requestSort('remarks')}><div className="flex items-center">Notes {getSortIcon('remarks')}</div></th>
                <th className={thClass} onClick={() => requestSort('category')}><div className="flex items-center">Category{getSortIcon('category')}</div></th>
                {/* Unified Responsible Party Column */}
                <th className={thClass} onClick={() => requestSort(isVendorView ? 'vendor' : 'assignees')}><div className="flex items-center">{isVendorView ? 'Vendor' : 'Assignees'} {getSortIcon(isVendorView ? 'vendor' : 'assignees')}</div></th>
                <th className={thClass} onClick={() => requestSort('owner')}><div className="flex items-center">Owner {getSortIcon('owner')}</div></th>
                {/* Project and Client are now always present */}
                <th className={thClass} onClick={() => requestSort('project')}><div className="flex items-center">Project {getSortIcon('project')}</div></th>
                <th className={thClass} onClick={() => requestSort('clientName')}><div className="flex items-center">Client {getSortIcon('clientName')}</div></th>
                <th className={thClass} onClick={() => requestSort('status')}><div className="flex items-center">Status {getSortIcon('status')}</div></th>
                <th className={thClass} onClick={() => requestSort('lastUpdateDate')}><div className="flex items-center">Last Update {getSortIcon('lastUpdateDate')}</div></th>
                <th className={thClass} onClick={() => requestSort('lastUpdateRemarks')}><div className="flex items-center">Remark {getSortIcon('lastUpdateRemarks')}</div></th>
                <th className={thClass} onClick={() => requestSort('priority')}><div className="flex items-center">Priority {getSortIcon('priority')}</div></th>
                <th className={thClass} onClick={() => requestSort('dueDate')}><div className="flex items-center">Due Date {getSortIcon('dueDate')}</div></th>
                <th className="px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-600 last:border-r-0 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task, idx) => {
                const isSyncing = syncingIds.has(task.id);
                const canDelete = currentUser?.role === 'Admin' || task.owner.includes(currentUser?.name || '');
                const displayCategory = task.vendor ? (task.vendorCategory || '-') : (task.category || '-');
                const responsibleParty = task.vendor ? (task.vendor || '-') : (task.assignees || '-');
                
                return (
                  <tr key={task.id} className={`hover:bg-blue-50 transition-colors ${selectedIds.includes(task.id) ? 'bg-blue-50/50' : ''} ${isSyncing ? 'opacity-60' : ''}`}>
                    {showSelection && (
                      <td className={`${tdClass} text-center`}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 h-4 w-4" 
                          checked={selectedIds.includes(task.id)} 
                          onChange={() => handleSelectOne(task.id)}
                        />
                      </td>
                    )}
                    <td className={`${tdClass} text-center font-bold text-blue-600`}>{startIndex + idx}</td>
                    <td className={`${tdClass}`}><div className="flex items-center gap-1">{isSyncing && <Loader2 className="animate-spin text-blue-500" size={12} />}{formatDate(task.date)}</div></td>
                    <td className={`${tdClass} font-medium min-w-[200px]`}>{task.title || '-'}</td>
                    <td className={`${tdClass} min-w-[150px]`}>{task.remarks || '-'}</td>
                    <td className={tdClass}>{displayCategory}</td>
                    {/* Display responsible party */}
                    <td className={tdClass}>
                        <div className="flex items-center gap-1">
                            {task.vendor ? <Hammer size={12} className="text-orange-500"/> : <Users size={12} className="text-indigo-700"/>}
                            {responsibleParty}
                        </div>
                    </td>
                    <td className={tdClass}>{task.owner}</td>
                    {/* Project and Client displayed explicitly */}
                    <td className={`${tdClass} font-bold text-xs`}>{task.project.split(' (')[0]}</td>
                    <td className={`${tdClass} font-bold text-xs`}>{task.clientName || '-'}</td>
                    <td className={tdClass}><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>{task.status}</span></td>
                    <td className={`${tdClass}`}>
                        {task.status === 'Not Yet Started' ? '-' : (formatDate(task.lastUpdateDate || ''))}
                    </td>
                    <td className={`${tdClass} min-w-[150px]`}>
                        {task.status === 'Not Yet Started' ? '-' : (task.lastUpdateRemarks || '-')}
                    </td>
                    <td className={tdClass}>{task.priority}</td>
                    <td className={`${tdClass}`}>{formatDate(task.dueDate)}</td>
                    <td className={tdClass}>
                      <div className="flex items-center space-x-2 justify-center">
                        <button onClick={() => onUpdateTask(task)} disabled={isSyncing} className="px-2 py-1 bg-blue-600 rounded text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-30">Update</button>
                        <button onClick={() => onEditTask(task)} disabled={isSyncing} className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-30"><Edit2 size={16} /></button>
                        <button onClick={() => onViewHistory(task)} disabled={isSyncing} className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"><Info size={16} /></button>
                        {canDelete && <button onClick={() => onDeleteTask(task.id, isVendorView)} disabled={isSyncing} className="p-1 text-red-600 hover:text-red-800 disabled:opacity-30"><Trash2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`space-y-4 md:hidden ${viewMode === 'card' ? 'block' : 'hidden'}`}>
        {tasks.map((task, idx) => {
          const isSyncing = syncingIds.has(task.id);
          const isExpanded = expandedIds.has(task.id);
          const canDelete = currentUser?.role === 'Admin' || task.owner.includes(currentUser?.name || '');
          const isVendorTask = !!(task.vendor && task.vendor.trim() !== '');
          const priorityBorderColor = task.priority === 'High' ? 'border-red-500' : task.priority === 'Medium' ? 'border-amber-500' : 'border-blue-400';
          const responsiblePartyIcon = isVendorTask ? <Hammer size={12} className="text-orange-500"/> : <Users size={12} className="text-indigo-700"/>;
          const responsiblePartyText = isVendorTask ? (task.vendor || '-') : (task.assignees || '-');
          const displayCategory = isVendorTask ? (task.vendorCategory || '-') : (task.category || '-');


          return (
            <div key={task.id} className={`bg-white rounded-xl shadow-lg p-5 relative border-2 ${priorityBorderColor} ${isSyncing ? 'opacity-70' : ''}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2" onClick={() => toggleExpand(task.id)}>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">#{startIndex + idx}</span>
                    <h3 className="text-base font-bold leading-tight text-blue-800">{task.title || '-'}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleExpand(task.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {showSelection && (
                    <input 
                      type="checkbox" 
                      className="rounded border-blue-300 text-blue-600 h-5 w-5" 
                      checked={selectedIds.includes(task.id)} 
                      onChange={() => handleSelectOne(task.id)}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {/* Collapsed view always shows Project and Priority */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-blue-900/60">Project</span>
                        <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase whitespace-normal break-words">
                          <Layout size={12} className="text-orange-600 shrink-0" /> {task.project.split(' (')[0]}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-blue-900/60">Client</span>
                        <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase whitespace-normal break-words"><Building2 size={12} className="text-pink-600" /> {task.clientName || '-'}</div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-blue-900/60">Priority</span>
                        <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase whitespace-normal break-words">
                            <AlertTriangle size={12} className={task.priority === 'High' ? 'text-red-500' : task.priority === 'Medium' ? 'text-amber-500' : 'text-blue-500'} /> 
                            {task.priority}
                        </div>
                    </div>

                    {/* Show remaining fields only when expanded */}
                    {isExpanded && (
                      <>
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-blue-900/60">Owner</span>
                            <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase whitespace-normal break-words"><User size={12} className="text-blue-700" /> {task.owner}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-blue-900/60">{isVendorTask ? 'Vendor' : 'Assignees'}</span>
                            <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase whitespace-normal break-words">{responsiblePartyIcon} {responsiblePartyText}</div>
                        </div>
                        
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-blue-900/60">Category</span>
                            <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase whitespace-normal break-words"><Tag size={12} className="text-green-600" /> {displayCategory}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-blue-900/60">Task Date</span>
                            <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase whitespace-normal break-words"><Calendar size={12} className="text-blue-900" /> {formatDate(task.date)}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-blue-900/60">Update Date</span>
                            <div className="flex items-center gap-1.5 text-xs text-black font-bold uppercase whitespace-normal break-words"><Clock size={12} className="text-indigo-600" /> {formatDate(task.lastUpdateDate || '')}</div>
                        </div>
                      </>
                    )}
                </div>

                {isExpanded && task.remarks && task.remarks.trim() !== '' && (
                  <div className="flex items-start gap-2 bg-blue-50 p-2 rounded-lg text-blue-700 border border-blue-100 mt-2">
                      <Info size={14} className="mt-0.5 shrink-0 opacity-70" />
                      <p className="text-xs italic leading-relaxed whitespace-normal break-words">{task.remarks}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className={`flex items-center justify-center text-center px-2 py-1.5 rounded-full text-[8px] font-extrabold uppercase whitespace-normal break-words min-w-[90px] ${task.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-800 text-white'}`}>
                    {task.status}
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={() => onViewHistory(task)} className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-lg transition-colors shadow-sm"><Info size={18} /></button>
                    <button onClick={() => onEditTask(task)} className="p-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors shadow-sm"><Edit2 size={18} /></button>
                    {canDelete && <button onClick={() => onDeleteTask(task.id, isVendorView)} className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors shadow-sm"><Trash2 size={18} /></button>}
                    <button onClick={() => onUpdateTask(task)} className="ml-1 px-4 py-2 bg-white text-blue-600 border border-blue-600 text-[10px] font-extrabold rounded-lg uppercase shadow-sm">Update</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
