import React, { useState, useMemo, useEffect } from 'react';
import { Search, FileText, LayoutGrid, LayoutList, Calendar, User, Clock, AlertCircle, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, Trash2 } from 'lucide-react';
import { ActionLogEntry, Project } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { formatToIndianDate, formatToIndianDateTime, parseToISO } from '../App';

interface ActionLogViewProps {
  logs?: ActionLogEntry[];
  isVendorView?: boolean;
  onDeleteLog: (logId: number, taskId: number) => void;
  projects?: Project[];
  dashboardFilter?: { type: string; value: string; dateFrom?: string; dateTo?: string } | null;
  onClearDashboardFilter?: () => void;
}

type SortConfig = {
  key: keyof ActionLogEntry;
  direction: 'asc' | 'desc';
} | null;

export const ActionLogView: React.FC<ActionLogViewProps> = ({ 
    logs = [], 
    isVendorView = false, 
    onDeleteLog, 
    projects = [], 
    dashboardFilter = null,
    onClearDashboardFilter 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [updateDateFrom, setUpdateDateFrom] = useState('');
  const [updateDateTo, setUpdateDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterOwner, setFilterOwner] = useState('All Owners');
  const [filterAssignee, setFilterAssignee] = useState('All Assignees');
  const [filterProject, setFilterProject] = useState('All Projects');
  const [filterVendor, setFilterVendor] = useState('All Vendors');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (dashboardFilter) {
      if (dashboardFilter.type === 'owner') {
          setFilterOwner(dashboardFilter.value);
          setSearchTerm(''); 
      } else if (dashboardFilter.type === 'vendor') {
          setFilterVendor(dashboardFilter.value);
          setSearchTerm('');
      } else if (dashboardFilter.type === 'assignee') {
          setFilterAssignee(dashboardFilter.value);
          setSearchTerm('');
      }

      if (dashboardFilter.dateFrom) setUpdateDateFrom(dashboardFilter.dateFrom);
      if (dashboardFilter.dateTo) setUpdateDateTo(dashboardFilter.dateTo);
      
      if (dashboardFilter.dateFrom || dashboardFilter.dateTo) setShowFilters(true);
    }
  }, [dashboardFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, updateDateFrom, updateDateTo, filterStatus, filterOwner, filterAssignee, filterProject, filterVendor]);

  const requestSort = (key: keyof ActionLogEntry) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ActionLogEntry) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-white" /> : <ArrowDown size={14} className="ml-1 text-white" />;
  };

  const uniqueOwners = useMemo(() => Array.from(new Set(logs.flatMap(l => l.owner ? l.owner.split(',').map(s => s.trim()) : []))), [logs]);
  const uniqueAssignees = useMemo(() => Array.from(new Set(logs.flatMap(l => l.assignees ? l.assignees.split(',').map(s => s.trim()) : []))), [logs]);
  const uniqueProjects = useMemo(() => Array.from(new Set(logs.map(l => l.project || '').filter(p => p !== ''))), [logs]);
  const uniqueStatuses = useMemo(() => Array.from(new Set(logs.map(l => l.status))), [logs]);
  const uniqueVendors = useMemo(() => Array.from(new Set(logs.map(l => l.vendor || '').filter(v => v !== ''))), [logs]);

  const ownerOptions = [{ value: 'All Owners', label: 'All Owners' }, ...uniqueOwners.map(o => ({ value: o, label: o }))];
  const assigneeOptions = [{ value: 'All Assignees', label: 'All Assignees' }, ...uniqueAssignees.map(a => ({ value: a, label: a }))];
  const projectOptions = [{ value: 'All Projects', label: 'All Projects' }, ...uniqueProjects.map(p => ({ value: p, label: p }))];
  const statusOptions = [{ value: 'All Status', label: 'All Status' }, ...uniqueStatuses.map(s => ({ value: s, label: s }))];
  const vendorOptions = [{ value: 'All Vendors', label: 'All Vendors' }, ...uniqueVendors.map(v => ({ value: v, label: v }))];

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const matchesSearch = Object.values(log).some(val => 
          String(val || '').toLowerCase().includes(lowerTerm)
        );
        if (!matchesSearch) return false;
      }
      
      const logISO = parseToISO(log.updateDate);
      if (updateDateFrom && logISO < updateDateFrom) return false;
      if (updateDateTo && logISO > updateDateTo) return false;

      if (filterStatus !== 'All Status' && log.status !== filterStatus) return false;
      if (filterOwner !== 'All Owners' && !log.owner.includes(filterOwner)) return false;
      
      if (isVendorView) {
          if (filterVendor !== 'All Vendors' && log.vendor !== filterVendor) return false;
      } else {
          if (filterAssignee !== 'All Assignees' && !log.assignees.includes(filterAssignee)) return false;
          if (filterProject !== 'All Projects' && log.project !== filterProject) return false;
      }
      return true;
    });
  }, [logs, searchTerm, updateDateFrom, updateDateTo, filterStatus, filterOwner, filterAssignee, filterProject, filterVendor, isVendorView]);

  const sortedLogs = useMemo(() => {
    let sortableItems = [...filteredLogs];
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
  }, [filteredLogs, sortConfig]);

  const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedLogs, currentPage]);

  const handleExportExcel = () => {
    const headers = ['Task', 'Task Date', 'Update Date', 'Status', 'Remarks', 'Owner'];
    if (isVendorView) headers.push('Vendor');
    else headers.push('Assignee', 'Project', 'Client');

    const csvContent = [
        headers.join(','),
        ...sortedLogs.map(log => {
            const row = [`"${log.task.replace(/"/g, '""')}"`, log.taskDate, `"${log.updateDate}"`, log.status, `"${log.remarks.replace(/"/g, '""')}"`, `"${log.owner}"`];
            if (isVendorView) row.push(`"${log.vendor || ''}"`);
            else row.push(`"${log.assignees}"`, `"${log.project.split(' (')[0]}"`, `"${log.clientName || ''}"`);
            return row.join(',');
        })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${isVendorView ? 'Vendor_' : ''}Action_Log_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleClearFilters = () => {
      setUpdateDateFrom('');
      setUpdateDateTo('');
      setFilterStatus('All Status');
      setFilterOwner('All Owners');
      setFilterAssignee('All Assignees');
      setFilterProject('All Projects');
      setFilterVendor('All Vendors');
      setSearchTerm('');
      if (onClearDashboardFilter) onClearDashboardFilter();
  };

  const getFilterClass = (isActive: boolean) => 
    `w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${isActive ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-white border-blue-300 text-black'}`;

  const thClass = "px-6 py-4 text-xs font-bold text-white uppercase tracking-wider border-r border-blue-500 last:border-r-0 cursor-pointer hover:bg-blue-700 transition-colors select-none";
  const tdClass = "px-6 py-4 text-sm text-gray-900 border-r border-blue-100 last:border-r-0";

  const startEntry = sortedLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endEntry = Math.min(currentPage * itemsPerPage, sortedLogs.length);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-blue-600 uppercase tracking-tight">{isVendorView ? 'Vendor Update Log' : 'Task Update Log'}</h2>
          <p className="text-sm text-gray-600 mt-1">{isVendorView ? 'History of vendor task updates' : 'History of task updates'}</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto items-center">
            <div className="flex bg-blue-50 p-1 rounded-lg md:hidden border border-blue-200">
                <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow text-blue-600' : 'text-blue-500'}`}><LayoutGrid size={18} /></button>
                <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-blue-500'}`}><LayoutList size={18} /></button>
            </div>
            <button onClick={handleExportExcel} className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white border-2 border-blue-700 rounded-md hover:bg-blue-700 text-xs font-black uppercase tracking-widest shadow-sm transition-colors">
              <FileText size={16} />
              <span>Export Excel</span>
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center space-x-1 px-3 py-2 border-2 rounded-md text-xs font-black shadow-sm transition-all duration-200 uppercase tracking-widest ${showFilters ? 'bg-blue-600 border-blue-700 text-white' : 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'}`} title="Toggle Filters">
              <Filter size={16} />
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-blue-400 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-blue-600" size={18} />
          <input 
            type="text" 
            placeholder="Search log history..." 
            className={`w-full pl-10 pr-4 py-2 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm transition-colors font-bold ${searchTerm ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-blue-200 text-blue-900'}`} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-200`}>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Update From</label>
                <input type="date" className={getFilterClass(updateDateFrom !== '')} value={updateDateFrom} onChange={(e) => setUpdateDateFrom(e.target.value)}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Update To</label>
                <input type="date" className={getFilterClass(updateDateTo !== '')} value={updateDateTo} onChange={(e) => setUpdateDateTo(e.target.value)}/>
              </div>
              <div className="space-y-1 text-blue-600 font-bold uppercase tracking-wider">
                <SearchableSelect label={<span className="text-[10px] font-black uppercase tracking-widest">Status</span>} options={statusOptions} value={filterStatus} onChange={setFilterStatus} className="text-sm" />
              </div>
              <div className="space-y-1 text-blue-600 font-bold uppercase tracking-wider">
                <SearchableSelect label={<span className="text-[10px] font-black uppercase tracking-widest">Owner</span>} options={ownerOptions} value={filterOwner} onChange={setFilterOwner} className="text-sm" />
              </div>
              {isVendorView ? (
                  <div className="space-y-1 text-blue-600 font-bold uppercase tracking-wider">
                    <SearchableSelect label={<span className="text-[10px] font-black uppercase tracking-widest">Vendor</span>} options={vendorOptions} value={filterVendor} onChange={setFilterVendor} className="text-sm" />
                  </div>
              ) : (
                  <>
                    <div className="space-y-1 text-blue-600 font-bold uppercase tracking-wider">
                      <SearchableSelect label={<span className="text-[10px] font-black uppercase tracking-widest">Assignee</span>} options={assigneeOptions} value={filterAssignee} onChange={setFilterAssignee} className="text-sm" />
                    </div>
                    <div className="space-y-1 text-blue-600 font-bold uppercase tracking-wider">
                      <SearchableSelect label={<span className="text-[10px] font-black uppercase tracking-widest">Project</span>} options={projectOptions} value={filterProject} onChange={setFilterProject} className="text-sm" />
                    </div>
                  </>
              )}
              <div className="flex items-end">
                  <button onClick={handleClearFilters} className="w-full px-4 py-2 bg-red-600 text-white border-2 border-red-700 rounded-md hover:bg-red-700 text-xs font-black uppercase tracking-widest h-[42px] flex items-center justify-center gap-2">
                    <X size={16}/>Clear
                  </button>
              </div>
        </div>
      </div>

      <div className={`bg-white rounded-lg border-2 border-blue-400 shadow-sm overflow-hidden ${viewMode === 'card' ? 'hidden md:block' : 'block'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-600">
                <th className={thClass} onClick={() => requestSort('task')}><div className="flex items-center">Task {getSortIcon('task')}</div></th>
                <th className={thClass} onClick={() => requestSort('taskDate')}><div className="flex items-center">Task Date {getSortIcon('taskDate')}</div></th>
                <th className={thClass} onClick={() => requestSort('updateDate')}><div className="flex items-center">Update Date {getSortIcon('updateDate')}</div></th>
                <th className={thClass} onClick={() => requestSort('status')}><div className="flex items-center">Status {getSortIcon('status')}</div></th>
                <th className={thClass} onClick={() => requestSort('remarks')}><div className="flex items-center">Remarks {getSortIcon('remarks')}</div></th>
                <th className={thClass} onClick={() => requestSort('owner')}><div className="flex items-center">Owner {getSortIcon('owner')}</div></th>
                {isVendorView ? (
                    <th className={thClass} onClick={() => requestSort('vendor')}><div className="flex items-center">Vendor {getSortIcon('vendor')}</div></th>
                ) : (
                    <>
                      <th className={thClass} onClick={() => requestSort('assignees')}><div className="flex items-center">Assignee {getSortIcon('assignees')}</div></th>
                      <th className={thClass} onClick={() => requestSort('project')}><div className="flex items-center">Project {getSortIcon('project')}</div></th>
                    </>
                )}
                <th className="px-6 py-4 text-xs font-black text-white uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className={`${tdClass} font-bold max-w-[200px] truncate`} title={log.task}>{log.task}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatToIndianDate(log.taskDate)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatToIndianDateTime(log.updateDate)}</td>
                  <td className={tdClass}><span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-black uppercase tracking-tighter whitespace-nowrap border border-blue-200">{log.status}</span></td>
                  <td className={`${tdClass} max-w-[200px] truncate italic text-blue-800`} title={log.remarks}>{log.remarks}</td>
                  <td className={`${tdClass} font-bold text-xs`}>{log.owner}</td>
                  {isVendorView ? (
                    <td className={`${tdClass} font-bold text-xs`}>{log.vendor}</td>
                  ) : (
                    <>
                      <td className={`${tdClass} font-bold text-xs`}>{log.assignees}</td>
                      <td className={`${tdClass} font-bold text-xs max-w-[120px] truncate`}>{log.project.split(' (')[0]}</td>
                    </>
                  )}
                  <td className={`${tdClass} text-center`}>
                    <button onClick={() => onDeleteLog(log.id, log.taskId)} className="p-1.5 text-red-500 hover:bg-red-50 border-2 border-transparent hover:border-red-600 rounded-md transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (<tr><td colSpan={10} className="px-6 py-12 text-center text-blue-300 font-black uppercase">No update logs found.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};