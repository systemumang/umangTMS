import React, { useMemo } from 'react';
import { Plus, UserPlus, Folder, CheckSquare, Clock, AlertTriangle, CheckCircle, Users, Building2, Truck, FileText, RotateCcw, LayoutList, History } from 'lucide-react';
import { StatCard } from './StatCard';
import { QuickAction } from './QuickAction';
import { PendingTable } from './PendingTable';
import { Task, User, Project, ActionLogEntry, RecurringTaskAction } from '../types';
import { parseToISO } from '../App';

interface DashboardProps {
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
  actionLogs?: ActionLogEntry[];
  recurringActions?: RecurringTaskAction[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
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
  actionLogs = [],
  recurringActions = []
}) => {
  
  const stats = useMemo(() => {
    const regularTasks = tasks.filter(t => !t.vendor || t.vendor.trim() === '');
    const totalTasks = regularTasks.length;
    const pendingTasks = regularTasks.filter(t => t.status !== 'Completed').length;
    const overdueTasks = regularTasks.filter(t => t.status !== 'Completed' && new Date(t.dueDate) < new Date()).length;
    const completedTasks = regularTasks.filter(t => t.status === 'Completed').length;
    const totalUsers = users.length;
    return { totalTasks, pendingTasks, overdueTasks, completedTasks, totalUsers };
  }, [tasks, users]);

  const assigneeData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; notStarted: number; inProgress: number }>();
    tasks.forEach(task => {
      if (!!(task.vendor && task.vendor.trim() !== '')) return; 
      if (task.status === 'Completed') return;
      const assignees = task.assignees ? task.assignees.split(',').map(s => s.trim()) : ['Unassigned'];
      assignees.forEach(assignee => {
        if (!map.has(assignee)) map.set(assignee, { name: assignee, total: 0, notStarted: 0, inProgress: 0 });
        const entry = map.get(assignee)!;
        entry.total += 1;
        if (task.status === 'Not Yet Started') entry.notStarted += 1;
        if (task.status === 'In Progress' || task.status === 'Started') entry.inProgress += 1;
      });
    });
    return Array.from(map.values());
  }, [tasks]);

  const projectData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; notStarted: number; inProgress: number }>();
    tasks.forEach(task => {
      if (!!(task.vendor && task.vendor.trim() !== '')) return;
      if (task.status === 'Completed') return;
      const projectName = task.project || 'Unknown Project';
      const projectObj = projects.find(p => p.name === projectName);
      const displayName = projectObj ? `${projectName} (${projectObj.client})` : projectName;
      if (!map.has(displayName)) map.set(displayName, { name: displayName, total: 0, notStarted: 0, inProgress: 0 });
      const entry = map.get(displayName)!;
      entry.total += 1;
      if (task.status === 'Not Yet Started') entry.notStarted += 1;
      if (task.status === 'In Progress' || task.status === 'Started') entry.inProgress += 1;
    });
    return Array.from(map.values());
  }, [tasks, projects]);

  const vendorData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; notStarted: number; inProgress: number }>();
    tasks.forEach(task => {
      if (!task.vendor || task.vendor.trim() === '') return;
      if (task.status === 'Completed') return;
      const vendor = task.vendor;
      if (!map.has(vendor)) map.set(vendor, { name: vendor, total: 0, notStarted: 0, inProgress: 0 });
      const entry = map.get(vendor)!;
      entry.total += 1;
      if (task.status === 'Not Yet Started') entry.notStarted += 1;
      if (task.status === 'In Progress' || task.status === 'Started') entry.inProgress += 1;
    });
    return Array.from(map.values());
  }, [tasks]);

  // Robust "Today" ISO string for consistent filtering
  const isoToday = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter and count Daily Task Updates (By Assignee) for Today
  const dailyUpdates = useMemo(() => {
    const map = new Map<string, number>();
    actionLogs
      .filter(l => !l.vendor && parseToISO(l.updateDate) === isoToday)
      .forEach(log => {
        // Correctly handle multiple assignees if stored as comma-separated string
        const names = (log.assignees || '').split(',').map(s => s.trim()).filter(Boolean);
        names.forEach(n => map.set(n, (map.get(n) || 0) + 1));
      });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [actionLogs, isoToday]);

  // Filter and count Vendor Task Updates (By Vendor) for Today
  const vendorUpdates = useMemo(() => {
    const map = new Map<string, number>();
    actionLogs
      .filter(l => !!l.vendor && parseToISO(l.updateDate) === isoToday)
      .forEach(log => {
        if (log.vendor) {
          map.set(log.vendor, (map.get(log.vendor) || 0) + 1);
        }
      });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [actionLogs, isoToday]);

  // Filter and count Recurring Task Updates (By Assignee) for Today
  const recurringUpdates = useMemo(() => {
    const map = new Map<string, number>();
    recurringActions
      .filter(a => parseToISO(a.updatedOn) === isoToday)
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
      {/* Header */}
      <div className="flex justify-center md:justify-center lg:justify-center">
        <h2 className="text-3xl font-black text-blue-700 uppercase tracking-widest border-b-4 border-blue-600 pb-2">Dashboard Overview</h2>
      </div>

      {/* Quick Actions */}
      <div className="bg-sky-50 p-6 rounded-2xl shadow-md border-2 border-blue-300">
        <SectionHeader title="Quick Control" icon={<LayoutList size={20}/>} />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <QuickAction 
            label="New Task" icon={<Plus size={18} />} 
            colorClass="bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={onOpenNewTask}
          />
          <QuickAction 
            label="Add User" icon={<UserPlus size={18} />} 
            colorClass="bg-indigo-500 hover:bg-indigo-600 text-white" 
            onClick={onOpenAddUser}
          />
          <QuickAction 
            label="Add Vendor" icon={<Truck size={18} />} 
            colorClass="bg-orange-500 hover:bg-orange-600 text-white" 
            onClick={onOpenAddVendor}
          />
          <QuickAction 
            label="Add Client" icon={<Building2 size={18} />} 
            colorClass="bg-pink-500 hover:bg-pink-600 text-white" 
            onClick={onOpenAddClient}
          />
          <QuickAction 
            label="Add Project" icon={<Folder size={18} />} 
            colorClass="bg-emerald-500 hover:bg-emerald-600 text-white" 
            onClick={onOpenAddProject}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-blue-50/70 p-6 rounded-2xl border-2 border-blue-300 shadow-sm">
        <SectionHeader title="Live Statistics" icon={<Clock size={20}/>} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard 
              title="Total Tasks" 
              value={stats.totalTasks} 
              icon={<CheckSquare size={20}/>} 
              iconBgColor="bg-blue-100" 
              iconColor="text-blue-600" 
            />
            <StatCard 
              title="Pending" 
              value={stats.pendingTasks} 
              icon={<Clock size={20}/>} 
              iconBgColor="bg-amber-100" 
              iconColor="text-amber-600" 
              onClick={() => onNavigate('pending')}
            />
            <StatCard 
              title="Overdue" 
              value={stats.overdueTasks} 
              icon={<AlertTriangle size={20}/>} 
              iconBgColor="bg-red-100" 
              iconColor="text-red-600" 
            />
            <StatCard 
              title="Completed" 
              value={stats.completedTasks} 
              icon={<CheckCircle size={20}/>} 
              iconBgColor="bg-green-100" 
              iconColor="text-green-600" 
              onClick={() => onNavigate('completed')}
            />
            <StatCard 
              title="Total Users" 
              value={stats.totalUsers} 
              icon={<Users size={20}/>} 
              iconBgColor="bg-indigo-100" 
              iconColor="text-indigo-600" 
              onClick={() => onNavigate('users')}
            />
        </div>
      </div>

      {/* Main Analysis Tables - Vertically Stacked */}
      <div className="grid grid-cols-1 gap-8">
        <PendingTable 
          title="Pending by Assignee" 
          headerLabel="Assignee Name" 
          data={assigneeData} 
          onRowClick={(name) => onFilterChange('assignee', name)}
        />
        <PendingTable 
          title="Pending by Project" 
          headerLabel="Project Name" 
          data={projectData} 
          onRowClick={(name) => onFilterChange('project', name)}
        />
        <PendingTable 
          title="Pending by Vendor" 
          headerLabel="Vendor Name" 
          data={vendorData} 
          onRowClick={(name) => onFilterChange('vendor', name)}
          className="bg-orange-50/30"
        />
      </div>

      {/* Today's Activity Recap */}
      <div className="space-y-6">
        <SectionHeader title="Today's Activity Recap" icon={<History size={20}/>} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Employee Updates */}
           <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-blue-50 pb-2">
                 <Users size={18} className="text-indigo-600" />
                 <h4 className="text-sm font-black text-indigo-900 uppercase">Employee Updates</h4>
              </div>
              <div className="flex-1 space-y-2">
                 {dailyUpdates.map(u => (
                    <div key={u.name} onClick={() => onFilterChange('employee-log', u.name)} className="flex items-center justify-between p-2.5 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors border border-indigo-100 bg-indigo-50/10 shadow-sm">
                       <span className="text-xs font-bold text-indigo-900">{u.name}</span>
                       <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">{u.count}</span>
                    </div>
                 ))}
                 {dailyUpdates.length === 0 && <p className="text-[10px] text-gray-400 italic text-center py-4 uppercase font-bold">No updates today</p>}
              </div>
           </div>

           {/* Vendor Updates */}
           <div className="bg-white p-5 rounded-2xl border-2 border-orange-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-orange-50 pb-2">
                 <Truck size={18} className="text-orange-600" />
                 <h4 className="text-sm font-black text-orange-900 uppercase">Vendor Updates</h4>
              </div>
              <div className="flex-1 space-y-2">
                 {vendorUpdates.map(u => (
                    <div key={u.name} onClick={() => onFilterChange('vendor-log', u.name)} className="flex items-center justify-between p-2.5 hover:bg-orange-50 rounded-xl cursor-pointer transition-colors border border-orange-100 bg-orange-50/10 shadow-sm">
                       <span className="text-xs font-bold text-orange-900">{u.name}</span>
                       <span className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">{u.count}</span>
                    </div>
                 ))}
                 {vendorUpdates.length === 0 && <p className="text-[10px] text-gray-400 italic text-center py-4 uppercase font-bold">No updates today</p>}
              </div>
           </div>

           {/* Recurring Task Updates */}
           <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-emerald-50 pb-2">
                 <RotateCcw size={18} className="text-emerald-600" />
                 <h4 className="text-sm font-black text-emerald-900 uppercase">Recurring Updates</h4>
              </div>
              <div className="flex-1 space-y-2">
                 {recurringUpdates.map(u => (
                    <div key={u.name} onClick={() => onFilterChange('recurring-log', u.name)} className="flex items-center justify-between p-2.5 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors border border-emerald-100 bg-emerald-50/10 shadow-sm">
                       <span className="text-xs font-bold text-emerald-900">{u.name}</span>
                       <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black shadow-sm">{u.count}</span>
                    </div>
                 ))}
                 {recurringUpdates.length === 0 && <p className="text-[10px] text-gray-400 italic text-center py-4 uppercase font-bold">No updates today</p>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};