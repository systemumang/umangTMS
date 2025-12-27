import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Download, FileText, Search, CheckSquare, LayoutGrid, LayoutList, Filter, X, Clock, AlertTriangle, Users, Trash2, AlertCircle } from 'lucide-react';
import { TaskTable } from './TaskTable';
import { UpdateTaskModal } from './UpdateTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { BulkUpdateModal } from './BulkUpdateModal';
import { Task, User, Project, Category, Vendor, VendorCategory } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { parseToISO } from '../App';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TasksViewProps {
  title: string;
  description: string;
  onAddTask: (isVendor?: boolean) => void;
  tasks: Task[];
  users: User[];
  projects: Project[];
  categories: Category[];
  vendors: Vendor[];
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onBulkUpdateTask: (ids: number[], updates: Partial<Task>) => void;
  onDeleteTask: (id: number, isVendor: boolean) => void;
  onExportExcel: (tasks: Task[]) => void;
  onViewHistory: (task: Task) => void;
  filterType?: 'all' | 'pending' | 'completed';
  onAddCategory: () => void;
  onAddProject: () => void;
  onAddVendorCategory?: () => void;
  isVendorView?: boolean;
  syncingIds?: Set<number>;
  currentUser?: User | null;
  vendorCategories: VendorCategory[];
  // Master Addition State Props
  lastAddedCategory?: string;
  lastAddedProject?: string;
  lastAddedVendorCategory?: string;
  onClearLastAdded?: () => void;
  
  // Controlled Filters from App
  filterStatus: string;
  setFilterStatus: (val: string) => void;
  filterPriority: string;
  setFilterPriority: (val: string) => void;
  filterProject: string;
  setFilterProject: (val: string) => void;
  filterClient: string;
  setFilterClient: (val: string) => void;
  filterOwner: string;
  setFilterOwner: (val: string) => void;
  filterAssignee: string;
  setFilterAssignee: (val: string) => void;
  filterVendor?: string;
  setFilterVendor?: (val: string) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
  lastUpdateFrom: string;
  setLastUpdateFrom: (val: string) => void;
  lastUpdateTo: string;
  setLastUpdateTo: (val: string) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ 
  title, 
  description, 
  onAddTask, 
  tasks, 
  users,
  projects,
  categories,
  vendors,
  onUpdateTask,
  onEditTask,
  onBulkUpdateTask,
  onDeleteTask,
  onExportExcel,
  onViewHistory,
  filterType = 'all',
  onAddCategory,
  onAddProject,
  onAddVendorCategory,
  isVendorView = false,
  syncingIds = new Set(),
  currentUser,
  vendorCategories = [],
  // Destructure master addition state
  lastAddedCategory = '',
  lastAddedProject = '',
  lastAddedVendorCategory = '',
  onClearLastAdded,
  filterStatus, setFilterStatus,
  filterPriority, setFilterPriority,
  filterProject, setFilterProject,
  filterClient, setFilterClient,
  filterOwner, setFilterOwner,
  filterAssignee, setFilterAssignee,
  filterVendor = 'All Vendors', setFilterVendor,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  lastUpdateFrom, setLastUpdateFrom,
  lastUpdateTo, setLastUpdateTo,
  searchTerm, setSearchTerm
}) => {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<'status' | 'priority' | 'assignee'>('status');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const isAdmin = currentUser?.role === 'Admin';

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setSelectedIds([]);
    setCurrentPage(1);
  }, [filterType, filterStatus, filterPriority, filterProject, filterClient, filterOwner, filterAssignee, filterVendor, dateFrom, dateTo, lastUpdateFrom, lastUpdateTo, searchTerm]);

  const matchesFilter = (task: Task, filterKey: string, value: string) => {
    if (!value || value.startsWith('All')) return true;
    switch(filterKey) {
        case 'status': return task.status === value;
        case 'priority': return task.priority === value;
        case 'project': return task.project === value;
        case 'client': return task.clientName === value;
        case 'owner': return task.owner.includes(value);
        case 'assignee': return task.assignees.includes(value);
        case 'vendor': return task.vendor === value;
        default: return true;
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterType === 'pending') {
          const project = projects.find(p => p.name === task.project || `${p.name} (${p.client})` === task.project);
          if (project && project.status === 'Inactive') return false;
          if (task.status === 'Completed') return false;
      }
      if (filterType === 'completed' && task.status !== 'Completed') return false;

      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        const matchesSearch = Object.values(task).some(val => 
          String(val || '').toLowerCase().includes(lowerTerm)
        );
        if (!matchesSearch) return false;
      }

      if (!matchesFilter(task, 'status', filterStatus)) return false;
      if (!matchesFilter(task, 'priority', filterPriority)) return false;
      if (!matchesFilter(task, 'project', filterProject)) return false;
      if (!matchesFilter(task, 'client', filterClient)) return false;
      if (!matchesFilter(task, 'owner', filterOwner)) return false;
      if (!matchesFilter(task, 'assignee', filterAssignee)) return false;
      if (isVendorView && filterVendor && !matchesFilter(task, 'vendor', filterVendor)) return false;

      const taskISO = parseToISO(task.date);
      if (dateFrom && taskISO < dateFrom) return false;
      if (dateTo && taskISO > dateTo) return false;

      const updateISO = parseToISO(task.lastUpdateDate || '');
      if (lastUpdateFrom && (!updateISO || updateISO < lastUpdateFrom)) return false;
      if (lastUpdateTo && (!updateISO || updateISO > lastUpdateTo)) return false;

      return true;
    });
  }, [tasks, projects, filterType, searchTerm, filterStatus, filterPriority, filterProject, filterClient, filterOwner, filterAssignee, filterVendor, dateFrom, dateTo, lastUpdateFrom, lastUpdateTo, isVendorView]);

  const projectOptions = useMemo(() => {
      const opts = projects.map(p => {
          const uniqueValue = `${p.name.trim()} (${p.client.trim()})`;
          return { value: uniqueValue, label: uniqueValue };
      });
      return [{ value: 'All Projects', label: 'All Projects' }, ...opts];
  }, [projects]);

  const clientOptions = useMemo(() => {
      const uniqueClients = Array.from(new Set(projects.map(p => p.client.trim()))).filter(Boolean);
      const opts = (uniqueClients as string[]).map(c => ({ value: c, label: c }));
      return [{ value: 'All Clients', label: 'All Clients' }, ...opts];
  }, [projects]);

  const ownerOptions = useMemo(() => {
      const opts = users.filter(u => u.isActive).map(u => ({ value: u.name, label: u.name }));
      return [{ value: 'All Owners', label: 'All Owners' }, ...opts];
  }, [users]);

  const assigneeOptions = useMemo(() => {
      const opts = users.filter(u => u.isActive).map(u => ({ value: u.name, label: u.name }));
      return [{ value: 'All Assignees', label: 'All Assignees' }, ...opts];
  }, [users]);

  const vendorOptions = useMemo(() => {
      const opts = vendors.map(v => ({ value: v.name, label: v.name }));
      return [{ value: 'All Vendors', label: 'All Vendors' }, ...opts];
  }, [vendors]);

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  
  const [sortKey, setSortKey] = useState<keyof Task>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
        const aVal = a[sortKey] || '';
        const bVal = b[sortKey] || '';
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
  }, [filteredTasks, sortKey, sortDir]);

  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTasks, currentPage]);

  const handleUpdateTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsUpdateModalOpen(true);
  };

  const handleEditTaskClick = (task: Task) => {
      setSelectedTask(task);
      setIsEditModalOpen(true);
  };

  const openBulkUpdate = (mode: 'status' | 'priority' | 'assignee') => {
    setBulkMode(mode);
    setIsBulkUpdateModalOpen(true);
  };

  const handleBulkUpdate = (updates: Partial<Task>) => {
    onBulkUpdateTask(selectedIds, updates);
    setSelectedIds([]);
  };

  const confirmBulkDelete = () => {
    selectedIds.forEach(id => onDeleteTask(id, isVendorView));
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);
  };

  const handleClearFilters = () => {
    setFilterStatus('All Status');
    setFilterPriority('All Priorities');
    setFilterProject('All Projects');
    setFilterClient('All Clients');
    setFilterOwner('All Owners');
    setFilterAssignee('All Assignees');
    if (setFilterVendor) setFilterVendor('All Vendors');
    setDateFrom('');
    setDateTo('');
    setLastUpdateFrom('');
    setLastUpdateTo('');
    setSearchTerm('');
  };

  const activeFilterBadges = useMemo(() => {
      const badges = [];
      if (filterStatus !== 'All Status') badges.push({ label: `Status: ${filterStatus}`, clear: () => setFilterStatus('All Status') });
      if (filterPriority !== 'All Priorities') badges.push({ label: `Priority: ${filterPriority}`, clear: () => setFilterPriority('All Priorities') });
      if (filterProject !== 'All Projects') badges.push({ label: `Project: ${filterProject}`, clear: () => setFilterProject('All Projects') });
      if (filterClient !== 'All Clients') badges.push({ label: `Client: ${filterClient}`, clear: () => setFilterClient('All Clients') });
      if (filterOwner !== 'All Owners') badges.push({ label: `Owner: ${filterOwner}`, clear: () => setFilterOwner('All Owners') });
      if (filterAssignee !== 'All Assignees') badges.push({ label: `Assignee: ${filterAssignee}`, clear: () => setFilterAssignee('All Assignees') });
      if (isVendorView && filterVendor !== 'All Vendors') badges.push({ label: `Vendor: ${filterVendor}`, clear: () => setFilterVendor?.('All Vendors') });
      return badges;
  }, [filterStatus, filterPriority, filterProject, filterClient, filterOwner, filterAssignee, filterVendor, isVendorView]);

  const getFilterClass = (isActive: boolean) => 
    `w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-colors ${isActive ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' : 'bg-white border-indigo-300 text-black'}`;

  const enableSelection = filterType === 'pending' || isAdmin;
  const startEntry = filteredTasks.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endEntry = Math.min(currentPage * itemsPerPage, filteredTasks.length);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-indigo-600">{title}</h2>
            <p className="text-sm text-black mt-1">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {selectedIds.length > 0 && enableSelection ? (
            <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in duration-200">
                <button onClick={() => openBulkUpdate('status')} className="flex items-center space-x-1 px-4 py-2 bg-indigo-50 text-indigo-700 border-2 border-indigo-200 rounded-md hover:bg-indigo-100 text-sm font-bold shadow-sm transition-colors uppercase tracking-wider">
                    <Clock size={16} /><span>Status ({selectedIds.length})</span>
                </button>
                <button onClick={() => openBulkUpdate('priority')} className="flex items-center space-x-1 px-4 py-2 bg-indigo-50 text-indigo-700 border-2 border-indigo-200 rounded-md hover:bg-indigo-100 text-sm font-bold shadow-sm transition-colors uppercase tracking-wider">
                    <AlertTriangle size={16} /><span>Priority</span>
                </button>
                <button onClick={() => openBulkUpdate('assignee')} className="flex items-center space-x-1 px-4 py-2 bg-indigo-50 text-indigo-700 border-2 border-indigo-200 rounded-md hover:bg-indigo-100 text-sm font-bold shadow-sm transition-colors uppercase tracking-wider">
                    <Users size={16} /><span>Assignee</span>
                </button>
                {isAdmin && (
                  <button onClick={() => setShowBulkDeleteConfirm(true)} className="flex items-center space-x-1 px-4 py-2 bg-red-600 text-white border-2 border-red-700 rounded-md hover:bg-red-700 text-sm font-bold shadow-sm transition-colors uppercase tracking-wider">
                    <Trash2 size={16} /><span>Bulk Delete</span>
                  </button>
                )}
            </div>
          ) : (
            <button onClick={() => onAddTask(isVendorView)} className="flex items-center space-x-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium shadow-sm transition-colors"><Plus size={16} /><span>Add Task</span></button>
          )}
          <button onClick={() => onExportExcel(filteredTasks)} className="flex items-center space-x-1 px-3 py-2 bg-white border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 text-sm font-medium shadow-sm transition-colors"><FileText size={16} className="text-green-600" /><span>Excel</span></button>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center space-x-1 px-3 py-2 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 ${showFilters ? 'bg-indigo-600 border-indigo-700 text-white ring-2 ring-indigo-200' : 'bg-indigo-50 border-indigo-300 text-indigo-600 hover:bg-indigo-100'}`} title="Toggle Filters"><Filter size={16} /></button>
          {filterType === 'pending' && <button onClick={() => {}} className="flex items-center space-x-1 px-3 py-2 bg-white border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 text-sm font-medium shadow-sm transition-colors"><Download size={16} className="text-red-500" /><span>PDF</span></button>}
          
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={() => setMobileViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${mobileViewMode === 'card' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-indigo-400'}`}
                title="Card View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setMobileViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${mobileViewMode === 'table' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-indigo-400'}`}
                title="Table View"
              >
                <LayoutList size={18} />
              </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-200 space-y-4">
        {activeFilterBadges.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2">
                {activeFilterBadges.map((badge, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-red-600 text-xs font-bold border border-indigo-200">
                        {badge.label}
                        <button onClick={badge.clear} className="p-0.5 hover:bg-indigo-200 rounded-full transition-colors"><X size={10} className="text-red-600" /></button>
                    </span>
                ))}
            </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-indigo-600" size={18} />
          <input 
            type="text" 
            placeholder="Search all columns (Task, Project, Assignee, Status, etc)..." 
            className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100 text-sm transition-colors ${searchTerm ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-medium' : 'border-indigo-300 text-indigo-700'}`} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end`}>
             <div className="col-span-1 space-y-1">
                <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={getFilterClass(filterStatus !== 'All Status')}>
                    <option>All Status</option><option>Not Yet Started</option><option>In Progress</option><option>Completed</option>
                </select>
             </div>
             <div className="col-span-1 space-y-1">
                <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Priority</label>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={getFilterClass(filterPriority !== 'All Priorities')}>
                    <option>All Priorities</option><option>High</option><option>Medium</option><option>Low</option>
                </select>
             </div>
             {!isVendorView && (
                 <div className="col-span-2 sm:col-span-1 space-y-1 text-indigo-600 font-semibold uppercase tracking-wider">
                     <SearchableSelect label="Project" options={projectOptions} value={filterProject} onChange={setFilterProject} className="text-sm"/>
                 </div>
             )}
             {!isVendorView && (
                 <div className="col-span-2 sm:col-span-1 space-y-1 text-indigo-600 font-semibold uppercase tracking-wider">
                     <SearchableSelect label="Client" options={clientOptions} value={filterClient} onChange={setFilterClient} className="text-sm"/>
                 </div>
             )}
              <div className="col-span-1 space-y-1 text-indigo-600 font-semibold uppercase tracking-wider">
                 <SearchableSelect label="Owner" options={ownerOptions} value={filterOwner} onChange={setFilterOwner} className="text-sm"/>
             </div>
             {!isVendorView && (
                 <div className="col-span-1 space-y-1 text-indigo-600 font-semibold uppercase tracking-wider">
                     <SearchableSelect label="Assignee" options={assigneeOptions} value={filterAssignee} onChange={setFilterAssignee} className="text-sm"/>
                </div>
             )}
             {isVendorView && setFilterVendor && (
                 <div className="col-span-1 space-y-1 text-indigo-600 font-semibold uppercase tracking-wider">
                     <SearchableSelect label="Vendor" options={vendorOptions} value={filterVendor} onChange={setFilterVendor} className="text-sm"/>
                 </div>
             )}
            <div className="col-span-1 relative">
                 <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1 block">Created From</label>
                 <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={getFilterClass(dateFrom !== '')}/>
            </div>
            <div className="col-span-1 relative">
                <label className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1 block">Created To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={getFilterClass(dateTo !== '')}/>
            </div>
            <div className="col-span-1">
                <button onClick={handleClearFilters} className="w-full px-3 py-2 bg-red-600 text-white border border-red-700 rounded-md hover:bg-red-700 text-sm font-medium transition-colors h-[38px] flex items-center justify-center" title="Clear Filters">Clear Filters</button>
            </div>
        </div>
      </div>

      <TaskTable 
        tasks={paginatedTasks} 
        onUpdateTask={handleUpdateTaskClick}
        onEditTask={handleEditTaskClick}
        onDeleteTask={onDeleteTask}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onViewHistory={onViewHistory}
        showSelection={enableSelection}
        isVendorView={isVendorView}
        viewMode={mobileViewMode}
        projects={projects}
        syncingIds={syncingIds}
        currentUser={currentUser}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
        startIndex={startEntry}
      />
      
      <div className="flex justify-between items-center text-xs text-indigo-600 font-bold px-1 uppercase tracking-wider">
          <span>Showing {startEntry} to {endEntry} of {filteredTasks.length} entries</span>
          <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase text-[10px]" 
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase text-[10px]"
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
              </button>
          </div>
      </div>

      <UpdateTaskModal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} task={selectedTask} onUpdate={onUpdateTask} users={users} vendors={vendors}/>
      <EditTaskModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        task={selectedTask} 
        onSave={onEditTask} 
        onAddCategory={onAddCategory} 
        onAddProject={onAddProject} 
        onAddVendorCategory={onAddVendorCategory!} 
        users={users} 
        categories={categories} 
        projects={projects} 
        vendors={vendors} 
        vendorCategories={vendorCategories}
        isVendorView={isVendorView}
        lastAddedCategory={lastAddedCategory}
        lastAddedProject={lastAddedProject}
        lastAddedVendorCategory={lastAddedVendorCategory}
        onClearLastAdded={onClearLastAdded}
      />
      <BulkUpdateModal 
        isOpen={isBulkUpdateModalOpen} 
        onClose={() => setIsBulkUpdateModalOpen(false)} 
        count={selectedIds.length} 
        onUpdate={handleBulkUpdate} 
        users={users} 
        vendors={vendors}
        isVendorView={isVendorView}
        mode={bulkMode}
      />

      {/* Custom Confirmation for Bulk Delete */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
              <div className="p-6 text-center space-y-4">
                 <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <AlertCircle size={32} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-gray-900 uppercase">Confirm Bulk Delete</h3>
                    <p className="text-sm text-gray-500 mt-2">
                       Are you sure you want to delete <strong>{selectedIds.length}</strong> selected tasks? 
                       <br/>This action cannot be undone.
                    </p>
                 </div>
                 <div className="flex gap-3 pt-2">
                    <button 
                       onClick={() => setShowBulkDeleteConfirm(false)}
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