import React, { useState, useMemo, useEffect } from 'react';
import { Search, History, Filter, X, FileText, Download, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { RecurringTaskAction } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RecurringTaskActionsViewProps {
  actions: RecurringTaskAction[];
  onDeleteAction: (logId: number, taskId: number) => void;
  dashboardFilter?: { type: string; value: string; dateFrom?: string; dateTo?: string } | null;
  onClearDashboardFilter?: () => void;
}

type SortConfig = {
  key: keyof RecurringTaskAction;
  direction: 'asc' | 'desc';
} | null;

export const RecurringTaskActionsView: React.FC<RecurringTaskActionsViewProps> = ({ 
    actions, 
    onDeleteAction, 
    dashboardFilter = null,
    onClearDashboardFilter 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (dashboardFilter && dashboardFilter.type === 'assignee') {
        setFilterAssignee(dashboardFilter.value);
        setSearchTerm(''); 
        
        if (dashboardFilter.dateFrom) {
            setFilterDate(dashboardFilter.dateFrom);
            setShowFilters(true);
        }
    }
  }, [dashboardFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterAssignee, filterStatus, filterDate]);

  const requestSort = (key: keyof RecurringTaskAction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof RecurringTaskAction) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-white" /> : <ArrowDown size={14} className="ml-1 text-white" />;
  };

  const categories = useMemo(() => ['All', ...Array.from(new Set(actions.map(a => a.category)))], [actions]);
  const assignees = useMemo(() => ['All', ...Array.from(new Set(actions.map(a => a.assignee)))], [actions]);
  const statuses = ['All', 'Not Yet Started', 'In Progress', 'Complete'];

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const matchesSearch = Object.values(action).some(val => 
          String(val || '').toLowerCase().includes(lowerTerm)
        );
        if (!matchesSearch) return false;
      }

      const matchesCategory = filterCategory === 'All' || action.category === filterCategory;
      const matchesAssignee = filterAssignee === 'All' || action.assignee === filterAssignee;
      const matchesStatus = filterStatus === 'All' || action.status === filterStatus;
      
      let matchesDate = true;
      if (filterDate) {
          // Compare yyyy-mm-dd input with dd/mm/yyyy data
          const inputDate = filterDate; // yyyy-mm-dd
          const actionDateParts = action.updatedOn.split('/');
          if (actionDateParts.length === 3) {
              const actionISO = `${actionDateParts[2]}-${actionDateParts[1].padStart(2, '0')}-${actionDateParts[0].padStart(2, '0')}`;
              matchesDate = actionISO === inputDate;
          } else {
              matchesDate = String(action.updatedOn).includes(filterDate);
          }
      }
      
      return matchesCategory && matchesAssignee && matchesStatus && matchesDate;
    });
  }, [actions, searchTerm, filterCategory, filterAssignee, filterStatus, filterDate]);

  const sortedActions = useMemo(() => {
    let sortableItems = [...filteredActions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? '';
        const bValue = b[sortConfig.key] ?? '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredActions, sortConfig]);

  const totalPages = Math.ceil(sortedActions.length / itemsPerPage);
  const paginatedActions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedActions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedActions, currentPage]);

  const formatDate = (dateInput: any) => {
    if (!dateInput) return '-';
    const s = String(dateInput).trim();
    const ddmmyyyyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ddmmyyyyMatch) return `${ddmmyyyyMatch[1].padStart(2, '0')}/${ddmmyyyyMatch[2].padStart(2, '0')}/${ddmmyyyyMatch[3]}`;
    const d = new Date(s.includes('T') ? s.split('T')[0] : s);
    if (!isNaN(d.getTime())) return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return s;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleClearFilters = () => {
    setFilterCategory('All'); 
    setFilterAssignee('All'); 
    setFilterStatus('All'); 
    setFilterDate(''); 
    setSearchTerm('');
    if (onClearDashboardFilter) onClearDashboardFilter();
  };

  const thClass = "px-4 py-3 text-[10px] font-black text-white uppercase tracking-widest border-r border-blue-500 last:border-r-0 cursor-pointer hover:bg-blue-700 transition-colors select-none";
  const tdClass = "px-4 py-3 text-xs text-black border-r border-blue-50 last:border-r-0 align-top";

  const startEntry = sortedActions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endEntry = Math.min(currentPage * itemsPerPage, sortedActions.length);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div><h2 className="text-2xl font-black text-blue-600 uppercase tracking-tight">Recurring Actions</h2><p className="text-sm text-gray-600 mt-1">History of recurring task activity</p></div>
        <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center space-x-1 px-3 py-2 border-2 rounded-md text-xs font-black shadow-sm transition-all duration-200 uppercase tracking-widest ${showFilters ? 'bg-blue-600 border-blue-700 text-white' : 'bg-blue-50 border-blue-300 text-blue-600'}`}><Filter size={16} /><span>Filters</span></button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-blue-400 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-blue-600" size={18} />
          <input 
            type="text" 
            placeholder="Search recurring history..." 
            className={`w-full pl-10 pr-4 py-2 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm transition-colors font-bold ${searchTerm ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-200'}`} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <SearchableSelect label={<span className="text-[10px] font-black uppercase">Category</span>} options={categories.map(c => ({ value: c, label: c }))} value={filterCategory} onChange={setFilterCategory} />
            <SearchableSelect label={<span className="text-[10px] font-black uppercase">Assignee</span>} options={assignees.map(a => ({ value: a, label: a }))} value={filterAssignee} onChange={setFilterAssignee} />
            <div className="space-y-1"><label className="text-[10px] font-black text-blue-600 uppercase block mb-1">Status</label><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-3 py-2 border-2 border-blue-200 rounded-md text-sm">{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div className="space-y-1"><label className="text-[10px] font-black text-blue-600 uppercase block mb-1">Date</label><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full px-3 py-2 border-2 border-blue-200 rounded-md text-sm"/></div>
            <div className="flex items-end"><button onClick={handleClearFilters} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white border-2 border-red-700 rounded-md hover:bg-red-700 text-xs font-black uppercase tracking-widest h-[42px] transition-colors"><X size={16} />Clear</button></div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border-2 border-blue-400 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-600">
                <th className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-widest border-r border-blue-500 w-12 text-center">S.No.</th>
                <th className={thClass} onClick={() => requestSort('taskTitle')}><div className="flex items-center">Task {getSortIcon('taskTitle')}</div></th>
                <th className={thClass} onClick={() => requestSort('category')}><div className="flex items-center">Category {getSortIcon('category')}</div></th>
                <th className={thClass} onClick={() => requestSort('assignee')}><div className="flex items-center">Assignee {getSortIcon('assignee')}</div></th>
                <th className={thClass} onClick={() => requestSort('status')}><div className="flex items-center">Status {getSortIcon('status')}</div></th>
                <th className={thClass} onClick={() => requestSort('updatedOn')}><div className="flex items-center">Date {getSortIcon('updatedOn')}</div></th>
                <th className={thClass} onClick={() => requestSort('remarks')}><div className="flex items-center">Remarks {getSortIcon('remarks')}</div></th>
                <th className="px-4 py-3 text-[10px] font-black text-white uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {paginatedActions.map((action, idx) => (
                <tr key={action.id} className="hover:bg-blue-50 transition-colors">
                  <td className={`${tdClass} text-center font-bold text-blue-600`}>{startEntry + idx}</td>
                  <td className={`${tdClass} font-bold`}>{action.taskTitle}</td>
                  <td className={tdClass}>{action.category}</td>
                  <td className={tdClass}>{action.assignee}</td>
                  <td className={tdClass}><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter border border-blue-100 ${getStatusColor(action.status)}`}>{action.status}</span></td>
                  <td className={`${tdClass} whitespace-nowrap font-bold`}>{formatDate(action.updatedOn)}</td>
                  <td className={`${tdClass} italic text-blue-900`}>"{action.remarks}"</td>
                  <td className={`${tdClass} text-center`}>
                    <button onClick={() => onDeleteAction(action.id, action.taskId)} className="p-1.5 text-red-500 hover:bg-red-50 border-2 border-transparent hover:border-red-600 rounded-md transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {paginatedActions.length === 0 && (<tr><td colSpan={8} className="px-6 py-10 text-center text-blue-300 font-black uppercase">No activity found.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};