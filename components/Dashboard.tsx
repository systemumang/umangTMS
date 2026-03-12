import React, { useMemo } from 'react';
import { Plus, UserPlus, Folder, CheckSquare, Clock, AlertTriangle, CheckCircle, Users, Building2, Truck, FileText, RotateCcw, LayoutList, History, ShieldAlert, Tags, UserCheck, UserCog, GraduationCap, IndianRupee, Wallet } from 'lucide-react';
import { StatCard } from './StatCard';
import { QuickAction } from './QuickAction';
import { PendingTable } from './PendingTable';
import { Task, User, Project, ActionLogEntry, RecurringTaskAction, Category, TableRow } from '../types';
import { parseToISO } from '../App';

interface DashboardProps {
  isAdmin: boolean;
  onOpenNewTask: () => void;
  onOpenAddUser: () => void;
  onOpenAddProject: () => void;
  onOpenAddClient: () => void;
  onOpenAddVendor: () => void;
  onFilterChange: (type: string, value: string) => void;
  onNavigate: (tab: string) => void;
  tasks: Task[];
  users: User[];
  projects: Project[];
  categories: Category[];
  actionLogs?: ActionLogEntry[];
  recurringActions?: RecurringTaskAction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  isAdmin,
  onOpenNewTask, 
  onOpenAddUser,
  onOpenAddProject,
  onOpenAddClient,
  onOpenAddVendor,
  onFilterChange,
  onNavigate,
  tasks, 
  users, 
  projects,
  categories,
  actionLogs = [],
  recurringActions = []
}) => {
  
  const stats = useMemo(() => {
    const regularTasks = tasks.filter(t => !t.vendor || t.vendor.trim() === '');
    const totalTasks = regularTasks.length;
    const pendingTasks = regularTasks.filter(t => t.status !== 'Completed').length;
    
    const pendingClientTasks = regularTasks.filter(t => t.status === 'Pending for Client').length;
    const pendingOwnerTasks = regularTasks.filter(t => t.status === 'Pending for Owner').length;
    const pendingTrainingTasks = regularTasks.filter(t => t.status === 'Pending for Training').length;
    const pendingBillingTasks = regularTasks.filter(t => t.status === 'Pending for Billing').length;
    const pendingPaymentTasks = regularTasks.filter(t => t.status === 'Pending for Payment').length;

    const todayISO = new Date().toISOString().split('T')[0];
    const overdueTasks = regularTasks.filter(t => {
      if (t.status === 'Completed' || !t.dueDate) return false;
      const dueISO = parseToISO(t.dueDate);
      return dueISO && dueISO < todayISO;
    }).length;

    const completedTasks = regularTasks.filter(t => t.status === 'Completed').length;
    const totalUsers = users.length;
    return { totalTasks, pendingTasks, overdueTasks, completedTasks, totalUsers, pendingClientTasks, pendingOwnerTasks, pendingTrainingTasks, pendingBillingTasks, pendingPaymentTasks };
  }, [tasks, users]);

  const updateTableDataMap = (map: Map<string, TableRow>, key: string, status: string) => {
    if (!map.has(key)) {
      map.set(key, { name: key, total: 0, notStarted: 0, inProgress: 0, pendingClient: 0, pendingOwner: 0, pendingTraining: 0, pendingBilling: 0, pendingPayment: 0 });
    }
    const entry = map.get(key)!;
    entry.total += 1;
    if (status === 'Not Yet Started') entry.notStarted += 1;
    if (status === 'In Progress' || status === 'Started') entry.inProgress += 1;
    if (status === 'Pending for Client') entry.pendingClient += 1;
    if (status === 'Pending for Owner') entry.pendingOwner += 1;
    if (status === 'Pending for Training') entry.pendingTraining += 1;
    if (status === 'Pending for Billing') entry.pendingBilling += 1;
    if (status === 'Pending for Payment') entry.pendingPayment += 1;
  };

  const assigneeData = useMemo(() => {
    const map = new Map<string, TableRow>();
    tasks.forEach(task => {
      if (!!(task.vendor && task.vendor.trim() !== '')) return; 
      if (task.status === 'Completed') return;
      const assignees = task.assignees ? task.assignees.split(',').map(s => s.trim()) : ['Unassigned'];
      assignees.forEach(assignee => {
        updateTableDataMap(map, assignee, task.status);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const priorityData = useMemo(() => {
    const map = new Map<string, TableRow>();
    const priorities = ['High', 'Medium', 'Low'];
    priorities.forEach(p => map.set(p, { name: p, total: 0, notStarted: 0, inProgress: 0, pendingClient: 0, pendingOwner: 0, pendingTraining: 0, pendingBilling: 0, pendingPayment: 0 }));

    tasks.forEach(task => {
      if (!!(task.vendor && task.vendor.trim() !== '')) return;
      if (task.status === 'Completed') return;
      const p = task.priority || 'Medium';
      updateTableDataMap(map, p, task.status);
    });
    return Array.from(map.values()).filter(p => p.total > 0);
  }, [tasks]);

  const projectData = useMemo(() => {
    const map = new Map<string, TableRow>();
    tasks.forEach(task => {
      if (!!(task.vendor && task.vendor.trim() !== '')) return;
      if (task.status === 'Completed') return;
      const projectName = task.project || 'Unknown Project';
      const projectObj = projects.find(p => p.name === projectName);
      const displayName = projectObj ? `${projectName} (${projectObj.client})` : projectName;
      updateTableDataMap(map, displayName, task.status);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, projects]);

  const categoryData = useMemo(() => {
    const map = new Map<string, TableRow>();
    tasks.forEach(task => {
      if (!!(task.vendor && task.vendor.trim() !== '')) return;
      if (task.status === 'Completed') return;
      const categoryName = task.category || 'Uncategorized';
      updateTableDataMap(map, categoryName, task.status);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const vendorData = useMemo(() => {
    const map = new Map<string, TableRow>();
    tasks.forEach(task => {
      if (!task.vendor || task.vendor.trim() === '') return;
      if (task.status === 'Completed') return;
      const vendor = task.vendor;
      updateTableDataMap(map, vendor, task.status);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const isoToday = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-CA');
  }, []);

  const dailyUpdates = useMemo(() => {
    const map = new Map<string, number>();
    actionLogs
      .filter(l => {
        if (l.vendor && l.vendor.trim() !== '') return false;
        const logDateStr = parseToISO(l.updateDate);
        return logDateStr === isoToday;
      })
      .forEach(log => {
        const nameStr = log.assignees || log.owner || 'Unknown';
        const names = nameStr.split(',').map(s => s.trim()).filter(Boolean);
        names.forEach(n => map.set(n, (map.get(n) || 0) + 1));
      });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [actionLogs, isoToday]);

  const vendorUpdates = useMemo(() => {
    const map = new Map<string, number>();
    actionLogs
      .filter(l => {
        if (!l.vendor || l.vendor.trim() === '') return false;
        const logDateStr = parseToISO(l.updateDate);
        return logDateStr === isoToday;
      })
      .forEach(log => {
        if (log.vendor) {
          map.set(log.vendor, (map.get(log.vendor) || 0) + 1);
        }
      });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [actionLogs, isoToday]);

  const recurringUpdates = useMemo(() => {
    const map = new Map<string, number>();
    recurringActions
      .filter(a => {
        const actionDateStr = parseToISO(a.updatedOn);
        return actionDateStr === isoToday;
      })
      .forEach(action => {
        if (action.assignee) {
          map.set(action.assignee, (map.get(action.assignee) || 0) + 1);
        }
      });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [recurringActions, isoToday]);

  const SectionHeader = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-4">
        <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">{icon}</span>
        <h3 className="text-lg font-black text-blue-800 uppercase tracking-tight">{title}</h3>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Centered Dashboard Title as requested */}
      <div className="flex flex-col items-center justify-center pt-2">
        <h2 className="text-3xl font-black text-blue-700 uppercase tracking-[0.1em]">Task Dashboard</h2>
        <div className="w-64 h-1 bg-blue-600 mt-2 rounded-full"></div>
      </div>

      {isAdmin && (
        <div className="bg-sky-50 p-6 rounded-2xl shadow-md border-2 border-blue-300">
          <SectionHeader title="Quick Control" icon={<LayoutList size={20}/>} />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <QuickAction label="New Task" icon={<Plus size={18} />} colorClass="bg-blue-600 hover:bg-blue-700 text-white" onClick={onOpenNewTask}/>
            <QuickAction label="Add User" icon={<UserPlus size={18} />} colorClass="bg-indigo-500 hover:bg-indigo-600 text-white" onClick={onOpenAddUser}/>
            <QuickAction label="Add Vendor" icon={<Truck size={18} />} colorClass="bg-orange-500 hover:bg-orange-600 text-white" onClick={onOpenAddVendor}/>
            <QuickAction label="Add Client" icon={<Building2 size={18} />} colorClass="bg-pink-500 hover:bg-pink-600 text-white" onClick={onOpenAddClient}/>
            <QuickAction label="Add Project" icon={<Folder size={18} />} colorClass="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={onOpenAddProject}/>
          </div>
        </div>
      )}

      <div className="bg-blue-50/70 p-6 rounded-2xl border-2 border-blue-300 shadow-sm">
        <SectionHeader title="Live Statistics" icon={<Clock size={20}/>} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-10 gap-4">
            <StatCard title="Total Tasks" value={stats.totalTasks} icon={<CheckSquare size={20}/>} iconBgColor="bg-blue-100" iconColor="text-blue-600" onClick={() => onNavigate('all-tasks')} />
            <StatCard title="Pending" value={stats.pendingTasks} icon={<Clock size={20}/>} iconBgColor="bg-amber-100" iconColor="text-amber-600" onClick={() => onNavigate('pending')}/>
            <StatCard title="For Client" value={stats.pendingClientTasks} icon={<UserCheck size={20}/>} iconBgColor="bg-purple-100" iconColor="text-purple-600" onClick={() => onNavigate('pending-client')}/>
            <StatCard title="For Owner" value={stats.pendingOwnerTasks} icon={<UserCog size={20}/>} iconBgColor="bg-indigo-100" iconColor="text-indigo-600" onClick={() => onNavigate('pending-owner')}/>
            <StatCard title="For Training" value={stats.pendingTrainingTasks} icon={<GraduationCap size={20}/>} iconBgColor="bg-cyan-100" iconColor="text-cyan-700" onClick={() => onNavigate('pending-training')}/>
            <StatCard title="For Billing" value={stats.pendingBillingTasks} icon={<IndianRupee size={20}/>} iconBgColor="bg-orange-100" iconColor="text-orange-700" onClick={() => onNavigate('pending-billing')}/>
            <StatCard title="For Payment" value={stats.pendingPaymentTasks} icon={<Wallet size={20}/>} iconBgColor="bg-emerald-100" iconColor="text-emerald-700" onClick={() => onNavigate('pending-payment')}/>
            <StatCard title="Overdue" value={stats.overdueTasks} icon={<AlertTriangle size={20}/>} iconBgColor="bg-red-100" iconColor="text-red-600" onClick={() => onFilterChange('status', 'Overdue')}/>
            <StatCard title="Completed" value={stats.completedTasks} icon={<CheckCircle size={20}/>} iconBgColor="bg-green-100" iconColor="text-green-600" onClick={() => onNavigate('completed')}/>
            <StatCard title="Total Users" value={stats.totalUsers} icon={<Users size={20}/>} iconBgColor="bg-indigo-100" iconColor="text-indigo-600" onClick={isAdmin ? () => onNavigate('users') : undefined}/>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <PendingTable title="Pending by Assignee" headerLabel="Assignee Name" data={assigneeData} onRowClick={(name) => onFilterChange('assignee', name)}/>
        <PendingTable title="Pending by Priority" headerLabel="Priority Level" data={priorityData} onRowClick={(name) => onFilterChange('priority', name)} className="bg-indigo-50/30"/>
        <PendingTable title="Pending by Project" headerLabel="Project Name" data={projectData} onRowClick={(name) => onFilterChange('project', name)}/>
        <PendingTable title="Pending by Categorywise" headerLabel="Category Name" data={categoryData} onRowClick={(name) => onFilterChange('category', name)} className="bg-indigo-50/30"/>
        <PendingTable title="Pending by Vendor" headerLabel="Vendor Name" data={vendorData} onRowClick={(name) => onFilterChange('vendor', name)} className="bg-orange-50/30"/>
      </div>

      <div className="space-y-6">
        <SectionHeader title="Today's Activity Recap" icon={<History size={20}/>} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-blue-50 pb-2">
                 <Users size={18} className="text-indigo-600" />
                 <h4 className="text-sm font-black text-indigo-900 uppercase">Employee Updates</h4>
              </div>
              <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                 {dailyUpdates.map(u => (
                    <div key={u.name} onClick={() => onFilterChange('employee-log', u.name)} className="flex items-center justify-between p-2.5 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors border border-indigo-100 bg-indigo-50/10 shadow-sm">
                       <span className="text-xs font-bold text-indigo-900">{u.name}</span>
                       <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">{u.count}</span>
                    </div>
                 ))}
                 {dailyUpdates.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-8 opacity-40">
                      <Clock size={32} className="text-gray-300 mb-2" />
                      <p className="text-[10px] text-gray-500 italic text-center uppercase font-bold tracking-widest">No employee activity today</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="bg-white p-5 rounded-2xl border-2 border-orange-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-orange-50 pb-2">
                 <Truck size={18} className="text-orange-600" />
                 <h4 className="text-sm font-black text-orange-900 uppercase">Vendor Updates</h4>
              </div>
              <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                 {vendorUpdates.map(u => (
                    <div key={u.name} onClick={() => onFilterChange('vendor-log', u.name)} className="flex items-center justify-between p-2.5 hover:bg-orange-50 rounded-xl cursor-pointer transition-colors border border-orange-100 bg-orange-50/10 shadow-sm">
                       <span className="text-xs font-bold text-orange-900">{u.name}</span>
                       <span className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">{u.count}</span>
                    </div>
                 ))}
                 {vendorUpdates.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                      <Clock size={32} className="text-gray-300 mb-2" />
                      <p className="text-[10px] text-gray-500 italic text-center uppercase font-bold tracking-widest">No vendor activity today</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-emerald-50 pb-2">
                 <RotateCcw size={18} className="text-emerald-600" />
                 <h4 className="text-sm font-black text-emerald-900 uppercase">Recurring Updates</h4>
              </div>
              <div className="flex-1 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                 {recurringUpdates.map(u => (
                    <div key={u.name} onClick={() => onFilterChange('recurring-log', u.name)} className="flex items-center justify-between p-2.5 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors border border-emerald-100 bg-emerald-50/10 shadow-sm">
                       <span className="text-xs font-bold text-emerald-900">{u.name}</span>
                       <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">{u.count}</span>
                    </div>
                 ))}
                 {recurringUpdates.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                      <Clock size={32} className="text-gray-300 mb-2" />
                      <p className="text-[10px] text-gray-500 italic text-center uppercase font-bold tracking-widest">No recurring updates today</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};