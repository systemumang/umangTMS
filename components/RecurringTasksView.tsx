import React, { useState, useMemo, useEffect } from 'react';
import { RotateCcw, Plus, Search, Filter, X, FileText, Download, Info, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Edit2, LayoutGrid, LayoutList, AlertCircle, Calendar } from 'lucide-react';
import { RecurringTask, RecurringTaskAction } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RecurringTasksViewProps {
  tasks: RecurringTask[];
  actions: RecurringTaskAction[]; 
  onAdd: () => void;
  onUpdate: (task: RecurringTask) => void;
  onEdit: (task: RecurringTask) => void;
  onViewHistory: (task: RecurringTask) => void;
  onDelete: (id: number) => void;
  title?: string;
  filterType?: 'all' | 'due';
  currentUser?: any;
  sidebarCollapsed?: boolean;
}

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

export const RecurringTasksView: React.FC<RecurringTasksViewProps> = ({ 
    tasks, 
    actions,
    onAdd, 
    onUpdate, 
    onEdit, 
    onViewHistory, 
    onDelete, 
    title = "Recurring Tasks",
    filterType = 'all',
    currentUser,
    sidebarCollapsed = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterFirm, setFilterFirm] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchTerm, filterCategory, filterFirm, filterAssignee, filterStatus, filterType]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(tasks.map(t => t.category)))], [tasks]);
  const firms = useMemo(() => ['All', ...Array.from(new Set(tasks.map(t => t.firm || '').filter(Boolean)))], [tasks]);
  const assignees = useMemo(() => ['All', ...Array.from(new Set(tasks.map(t => t.assignee)))], [tasks]);
  const statuses = ['All', 'Not Yet Started', 'In Progress', 'Complete'];

  const getLastCompletionDate = (task: RecurringTask): string => {
    const taskHistory = actions
      .filter(a => Number(a.taskId) === Number(task.id) && a.status === 'Complete')
      .sort((a, b) => {
         const parseDate = (ds: string) => {
            const [d, m, y] = ds.split('/');
            return new Date(`${y}-${m}-${d}`).getTime();
         };
         return parseDate(b.updatedOn) - parseDate(a.updatedOn);
      });

    return taskHistory.length > 0 ? taskHistory[0].updatedOn : task.startDate;
  };

  const getNextDueDateObject = (task: RecurringTask): Date | null => {
    const periodicity = task.periodicity || 'Fixed Days';
    const lastCompleteDateStr = getLastCompletionDate(task);
    
    const match = lastCompleteDateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    let lastComplete: Date;
    if (match) lastComplete = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
    else lastComplete = new Date(lastCompleteDateStr);
    
    if (isNaN(lastComplete.getTime())) return null;
    lastComplete.setHours(0, 0, 0, 0);

    if (periodicity === 'Fixed Days') {
        const nextDate = new Date(lastComplete);
        nextDate.setDate(lastComplete.getDate() + (task.frequencyDays || 30));
        return nextDate;
    }

    if (periodicity === 'Weekly') {
        const targetDay = task.recurrenceDay ?? 0;
        let diff = targetDay - lastComplete.getDay();
        // If the target day is today or in the past relative to the anchor, move to the next week's occurrence
        if (diff <= 0) diff += 7;
        
        const nextDate = new Date(lastComplete);
        nextDate.setDate(lastComplete.getDate() + diff);
        return nextDate;
    }

    if (periodicity === 'Monthly') {
        const targetDay = task.recurrenceDay ?? 1;
        // Start with the current anchor's month and year
        let nextDate = new Date(lastComplete.getFullYear(), lastComplete.getMonth(), targetDay);
        
        // If the resulting date is not strictly after our anchor, jump to the next month
        if (nextDate <= lastComplete) {
            nextDate = new Date(lastComplete.getFullYear(), lastComplete.getMonth() + 1, targetDay);
        }
        
        // Safety check for months with fewer days (e.g., Feb 30th -> March 2nd/last day of Feb)
        // JS Date automatically handles this, but we ensure it remains roughly the target day or end of month
        return nextDate;
    }

    if (periodicity === 'Yearly') {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const targetMonthIdx = months.indexOf(task.recurrenceMonth || 'January');
        const targetDay = task.recurrenceDay ?? 1;
        
        let nextDate = new Date(lastComplete.getFullYear(), targetMonthIdx, targetDay);
        
        // If today's rule match is in the past or is the anchor, move to next year
        if (nextDate <= lastComplete) {
            nextDate = new Date(lastComplete.getFullYear() + 1, targetMonthIdx, targetDay);
        }
        return nextDate;
    }

    return null;
  };

  const getNextDueDateStr = (task: RecurringTask) => {
    const nextDate = getNextDueDateObject(task);
    if (!nextDate) return '-';
    return `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`;
  };

  const getEffectiveStatus = (task: RecurringTask) => {
    const dbStatus = task.status || 'Not Yet Started';
    const nextDue = getNextDueDateObject(task);
    if (!nextDue) return dbStatus;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(nextDue);
    checkDate.setHours(0, 0, 0, 0);

    if (today >= checkDate) {
        if (dbStatus === 'Complete') return 'Not Yet Started';
        return dbStatus;
    }
    return dbStatus;
  };

	  const getFrequencyText = (task: RecurringTask) => {
	    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	    const weeklyDay =
	      typeof task.recurrenceDay === 'number' && task.recurrenceDay >= 0 && task.recurrenceDay <= 6
	        ? dayNames[task.recurrenceDay]
	        : null;
	    const monthlyDay =
	      typeof task.recurrenceDay === 'number' && task.recurrenceDay >= 1 && task.recurrenceDay <= 31
	        ? task.recurrenceDay
	        : null;

	    switch(task.periodicity) {
	      case 'Weekly': return weeklyDay ? `Weekly (${weeklyDay})` : 'Weekly';
	      case 'Monthly': return monthlyDay ? `Monthly on ${monthlyDay}` : 'Monthly';
	      case 'Yearly': {
	        const month = task.recurrenceMonth ? String(task.recurrenceMonth) : '';
	        if (month && monthlyDay) return `${month} ${monthlyDay}`;
	        if (month) return `Yearly (${month})`;
	        if (monthlyDay) return `Yearly (${monthlyDay})`;
	        return 'Yearly';
	      }
	      default: return `${task.frequencyDays}d`;
	    }
	  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const effectiveStatus = getEffectiveStatus(task);
      
      if (filterType === 'due') {
        const nextDue = getNextDueDateObject(task);
        if (!nextDue) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(nextDue);
        checkDate.setHours(0, 0, 0, 0);
        
        if (today < checkDate) return false;
        if (effectiveStatus === 'Complete') return false; 
      }

      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const matchesSearch = Object.values(task).some(val => 
          String(val || '').toLowerCase().includes(lowerTerm)
        );
        if (!matchesSearch) return false;
      }

      const matchesCategory = filterCategory === 'All' || task.category === filterCategory;
      const matchesFirm = filterFirm === 'All' || (task.firm || '') === filterFirm;
      const matchesAssignee = filterAssignee === 'All' || task.assignee === filterAssignee;
      const matchesStatus = filterStatus === 'All' || effectiveStatus === filterStatus;
      
      return matchesCategory && matchesFirm && matchesAssignee && matchesStatus;
    });
  }, [tasks, actions, searchTerm, filterCategory, filterFirm, filterAssignee, filterStatus, filterType]);

  const sortedTasks = useMemo(() => {
    let sortableItems = [...filteredTasks];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'nextDue') {
            aValue = getNextDueDateObject(a)?.getTime() || 0;
            bValue = getNextDueDateObject(b)?.getTime() || 0;
        } else if (sortConfig.key === 'status') {
            aValue = getEffectiveStatus(a);
            bValue = getEffectiveStatus(b);
        } else {
            aValue = (a as any)[sortConfig.key] ?? '';
            bValue = (b as any)[sortConfig.key] ?? '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTasks, sortConfig, actions]);

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTasks, currentPage]);

  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);

  const confirmBulkDelete = () => {
    selectedIds.forEach(id => onDelete(id));
    setSelectedIds([]);
    setShowDeleteConfirm(false);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(paginatedTasks.map(t => t.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  // Corrected requestSort implementation using internal state setSortConfig
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-white" /> : <ArrowDown size={14} className="ml-1 text-white" />;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const thClass = "px-4 py-3 text-[10px] font-bold text-white uppercase tracking-wider border-r border-indigo-500 last:border-r-0 cursor-pointer hover:bg-indigo-700 transition-colors select-none whitespace-normal";
  const tdClass = "px-4 py-3 text-xs text-black border-r border-black last:border-r-0 align-top whitespace-normal break-words";

  const startEntry = sortedTasks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endEntry = Math.min(currentPage * itemsPerPage, sortedTasks.length);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className={`flex justify-between items-start md:block ${sidebarCollapsed ? 'pl-14 md:pl-16' : ''}`}>
            <div>
                <h2 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
                    {filterType === 'due' && <AlertCircle className="text-red-500" size={24} />}
                    {title}
                </h2>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg md:hidden">
                <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}><LayoutGrid size={18} /></button>
                <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}><LayoutList size={18} /></button>
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && selectedIds.length > 0 && (
             <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center space-x-1 px-4 py-2 bg-red-600 text-white border-2 border-red-700 rounded-md hover:bg-red-700 text-sm font-bold shadow-sm transition-colors uppercase tracking-wider animate-in fade-in zoom-in duration-200">
                <Trash2 size={16} /><span>Bulk Delete ({selectedIds.length})</span>
             </button>
          )}
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center space-x-1 px-3 py-2 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 ${showFilters ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100'}`}><Filter size={16} /><span>Filters</span></button>
            {filterType !== 'due' && (
	            <button onClick={onAdd} className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition-colors shadow-sm"><Plus size={16} /><span>New Recurring Task</span></button>
            )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-300 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-indigo-600" size={18} />
          <input 
            type="text" 
            placeholder="Search all columns (Task, Category, Assignee, Status, etc)..." 
            className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-100 text-sm transition-colors ${searchTerm ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-300'}`} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
	            <SearchableSelect label="Category" options={categories.map(c => ({ value: c, label: c }))} value={filterCategory} onChange={setFilterCategory} />
              <SearchableSelect label="Firm" options={firms.map(f => ({ value: f, label: f }))} value={filterFirm} onChange={setFilterFirm} />
	            <SearchableSelect label="Assignee" options={assignees.map(a => ({ value: a, label: a }))} value={filterAssignee} onChange={setFilterAssignee} />
	            <div><label className="text-[10px] font-bold text-indigo-600 uppercase mb-1 block">Status</label><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border border-indigo-300 rounded-md text-sm">{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
	            <div className="flex items-end"><button onClick={() => { setFilterCategory('All'); setFilterFirm('All'); setFilterAssignee('All'); setFilterStatus('All'); setSearchTerm(''); }} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white border border-red-700 rounded-md hover:bg-red-700 text-sm font-medium h-[42px] transition-colors shadow-sm"><X size={16} />Clear</button></div>
          </div>
        )}
      </div>

      <div className={`bg-white rounded-lg border border-black shadow-sm overflow-hidden ${viewMode === 'card' ? 'hidden md:block' : 'block'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-600">
                {isAdmin && (
                  <th className="px-4 py-3 w-10 text-center border-r border-indigo-500 whitespace-normal">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 h-4 w-4" 
                      checked={paginatedTasks.length > 0 && selectedIds.length === paginatedTasks.length} 
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-[10px] font-bold text-white uppercase tracking-wider border-r border-indigo-500 w-16 text-center whitespace-nowrap">S.No.</th>
	                <th className={thClass} onClick={() => requestSort('title')}><div className="flex items-center">Task {getSortIcon('title')}</div></th>
                  <th className={thClass} onClick={() => requestSort('firm')}><div className="flex items-center">Firm {getSortIcon('firm')}</div></th>
                  <th className={thClass} onClick={() => requestSort('owner')}><div className="flex items-center">Owner {getSortIcon('owner')}</div></th>
	                <th className={thClass} onClick={() => requestSort('category')}><div className="flex items-center">Category {getSortIcon('category')}</div></th>
                <th className={thClass} onClick={() => requestSort('assignee')}><div className="flex items-center">Assignee {getSortIcon('assignee')}</div></th>
	                <th className={thClass} onClick={() => requestSort('status')}><div className="flex items-center">Status {getSortIcon('status')}</div></th>
	                <th className={thClass} onClick={() => requestSort('frequencyDays')}><div className="flex items-center">Rule {getSortIcon('frequencyDays')}</div></th>
	                <th className={thClass} onClick={() => requestSort('time')}><div className="flex items-center">Time {getSortIcon('time')}</div></th>
	                <th className={thClass} onClick={() => requestSort('lastUpdatedOn')}><div className="flex items-center">Activity {getSortIcon('lastUpdatedOn')}</div></th>
	                <th className={thClass} onClick={() => requestSort('remarks')}><div className="flex items-center">Remarks {getSortIcon('remarks')}</div></th>
	                <th className={thClass} onClick={() => requestSort('nextDue')}><div className="flex items-center">Next Due {getSortIcon('nextDue')}</div></th>
	                <th className="px-4 py-3 text-[10px] font-bold text-white uppercase tracking-wider text-center whitespace-normal">Actions</th>
	              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {paginatedTasks.map((task, idx) => {
                const effectiveStatus = getEffectiveStatus(task);
                const nextDueStr = getNextDueDateStr(task);
                const nextDueObj = getNextDueDateObject(task);
                const isOverdue = effectiveStatus !== 'Complete' && nextDueObj && (nextDueObj.getTime() < new Date().setHours(0,0,0,0));
                
                return (
                  <tr 
                    key={task.id} 
                    onDoubleClick={() => onUpdate(task)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIds.includes(task.id) ? 'bg-indigo-50/50' : ''}`}
                  >
                    {isAdmin && (
                      <td className={`${tdClass} text-center`} onDoubleClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 h-4 w-4" 
                          checked={selectedIds.includes(task.id)} 
                          onChange={() => handleSelectOne(task.id)}
                        />
                      </td>
                    )}
                    <td className={`${tdClass} text-center font-bold text-indigo-600 !whitespace-nowrap`}>{startEntry + idx}</td>
	                    <td className={`${tdClass} font-medium`}>{task.title}</td>
                      <td className={tdClass}>{task.firm || '-'}</td>
                      <td className={tdClass}>{task.owner || '-'}</td>
	                    <td className={tdClass}>{task.category}</td>
                    <td className={tdClass}>{task.assignee}</td>
                    <td className={tdClass}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(effectiveStatus)} whitespace-normal break-words`}>
                            {effectiveStatus}
                        </span>
                    </td>
	                    <td className={`${tdClass}`}>
	                      <div className="flex items-center gap-1">
	                        <Calendar size={12} className="text-indigo-400" />
	                        <span className="font-medium">{getFrequencyText(task)}</span>
	                      </div>
	                    </td>
	                    <td className={tdClass}>{task.time || '-'}</td>
	                    <td className={tdClass}>{task.lastUpdatedOn || '-'}</td>
	                    <td className={`${tdClass}`}>{task.lastUpdateRemarks || '-'}</td>
	                    <td className={`${tdClass} font-bold ${isOverdue ? 'text-red-600 animate-pulse' : 'text-indigo-600'}`}>
	                        {nextDueStr}
	                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-1 justify-center" onDoubleClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onUpdate(task)} className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700">Update</button>
                        <button onClick={() => onEdit(task)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit Master"><Edit2 size={16} /></button>
                        <button onClick={() => onViewHistory(task)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded"><Info size={16} /></button>
                        <button onClick={() => onDelete(task.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
		              {paginatedTasks.length === 0 && (<tr><td colSpan={isAdmin ? 14 : 13} className="px-6 py-10 text-center text-gray-500">No recurring tasks found.</td></tr>)}
	            </tbody>
	          </table>
	        </div>
	      </div>

      <div className={`space-y-4 md:hidden ${viewMode === 'card' ? 'block' : 'hidden'}`}>
        {paginatedTasks.map((task, idx) => {
             const effectiveStatus = getEffectiveStatus(task);
             const nextDueStr = getNextDueDateStr(task);
             const nextDueObj = getNextDueDateObject(task);
             const isOverdue = effectiveStatus !== 'Complete' && nextDueObj && (nextDueObj.getTime() < new Date().setHours(0,0,0,0));

             return (
                <div 
                  key={task.id} 
                  onDoubleClick={() => onUpdate(task)}
                  className={`bg-white rounded-lg shadow-sm border p-4 relative cursor-pointer ${selectedIds.includes(task.id) ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200'}`}
                >
                    <div className="mb-3">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-blue-600 h-5 w-5" 
                                    checked={selectedIds.includes(task.id)} 
                                    onChange={() => handleSelectOne(task.id)}
                                    onDoubleClick={(e) => e.stopPropagation()}
                                />
                            )}
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold">#{startEntry + idx}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(effectiveStatus)} whitespace-normal break-words`}>{effectiveStatus}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 leading-tight mt-2 whitespace-normal break-words">{task.title}</h3>
                    </div>
		                    <div className="grid grid-cols-2 gap-y-2 text-xs text-gray-600 mb-4 bg-gray-50 p-2 rounded">
                    <div><span className="text-gray-400 font-bold uppercase text-[9px] block">Firm</span><span className="whitespace-normal break-words">{task.firm || '-'}</span></div>
                    <div><span className="text-gray-400 font-bold uppercase text-[9px] block">Owner</span><span className="whitespace-normal break-words">{task.owner || '-'}</span></div>
		                    <div><span className="text-gray-400 font-bold uppercase text-[9px] block">Category</span><span className="whitespace-normal break-words">{task.category}</span></div>
	                    <div><span className="text-gray-400 font-bold uppercase text-[9px] block">Assignee</span><span className="whitespace-normal break-words">{task.assignee}</span></div>
	                    <div><span className="text-gray-400 font-bold uppercase text-[9px] block">Rule</span><span className="whitespace-normal break-words">{getFrequencyText(task)}</span></div>
	                    <div><span className="text-gray-400 font-bold uppercase text-[9px] block">Time</span><span className="whitespace-normal break-words">{task.time || '-'}</span></div>
	                    <div>
	                        <span className="text-indigo-500 font-bold uppercase text-[9px] block">Next Due</span>
	                        <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-indigo-600'} whitespace-normal break-words`}>{nextDueStr}</span>
	                    </div>
	                    </div>
                    <div className="flex gap-2 pt-3 border-t border-gray-100 flex-wrap">
                        <button onClick={() => onUpdate(task)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-normal break-words"><RotateCcw size={14} />Update</button>
                        <div className="flex gap-1 w-full sm:w-auto justify-end" onDoubleClick={(e) => e.stopPropagation()}>
                            <button onClick={() => onViewHistory(task)} className="p-2 text-indigo-500 hover:bg-gray-100 rounded-full border border-gray-100"><Info size={18} /></button>
                            <button onClick={() => onEdit(task)} className="p-2 text-indigo-600 hover:bg-gray-100 rounded-full border border-gray-100"><Edit2 size={18} /></button>
                            <button onClick={() => onDelete(task.id)} className="p-2 text-red-600 hover:bg-gray-100 rounded-full border border-gray-100"><Trash2 size={18} /></button>
                        </div>
                    </div>
                </div>
             );
        })}
      </div>

      <div className="flex justify-between items-center text-xs text-indigo-600 font-bold px-1 uppercase tracking-wider">
          <span>Showing {startEntry} to {endEntry} of {filteredTasks.length} entries</span>
          <div className="flex space-x-2">
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="px-4 py-1.5 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase text-[10px]" disabled={currentPage === 1}>Previous</button>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="px-4 py-1.5 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase text-[10px]" disabled={currentPage === totalPages || totalPages === 0}>Next</button>
          </div>
      </div>

      {/* Custom Confirmation for Bulk Delete */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="p-6 text-center space-y-4">
                 <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <Trash2 size={32} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-gray-900 uppercase">Delete Recurring Tasks?</h3>
                    <p className="text-sm text-gray-500 mt-2">
                       Are you sure you want to delete <strong>{selectedIds.length}</strong> selected recurring tasks? 
                       <br/>This will permanently remove the rules and history.
                    </p>
                 </div>
                 <div className="flex gap-3 pt-2">
                    <button 
                       onClick={() => setShowDeleteConfirm(false)}
                       className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors uppercase text-sm"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={confirmBulkDelete}
                       className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 uppercase text-sm"
                    >
                       Delete All
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
