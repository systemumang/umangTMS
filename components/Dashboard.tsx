import React, { useMemo } from 'react';
import { Plus, UserPlus, Clock, Users, Truck, RotateCcw, LayoutList, History, ShieldAlert, Tags, CheckSquare } from 'lucide-react';
import { StatCard } from './StatCard';
import { QuickAction } from './QuickAction';

import { Task, User, Project, ActionLogEntry, RecurringTaskAction, RecurringTask, Category, StatusMaster } from '../types';
import { parseToISO } from '../App';
import { useLabels } from '../labelOverrides';

const VENDOR_MODULE_ENABLED = false;

interface DashboardProps {
  isAdmin: boolean;
  onOpenNewTask: () => void;
  onOpenNewRecurringTask: () => void;
  onOpenAddUser: () => void;
  onOpenAddCategory: () => void;
  onOpenAddProject: () => void;
  onOpenAddClient: () => void;
  onOpenAddVendor: () => void;
  onFilterChange: (type: string, value: string) => void;
  onNavigate: (tab: string) => void;
  onUpdateTask: (task: Task) => void;
  onUpdateRecurringTask: (task: RecurringTask) => void;
  tasks: Task[];
  users: User[];
  projects: Project[];
  categories: Category[];
  statuses: StatusMaster[];
  actionLogs?: ActionLogEntry[];
  recurringActions?: RecurringTaskAction[];
  recurringTasks?: RecurringTask[];
  dashboardSummary?: { pendingSimpleTasks?: number; pendingRecurringTasks?: number } | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  isAdmin,
  onOpenNewTask, 
  onOpenNewRecurringTask,
  onOpenAddUser,
  onOpenAddCategory,
  onOpenAddProject,
  onOpenAddClient,
  onOpenAddVendor,
  onFilterChange,
  onNavigate,
  onUpdateTask,
  onUpdateRecurringTask,
  tasks, 
  users, 
  projects,
  categories,
  statuses,
  actionLogs = [],
  recurringActions = [],
  recurringTasks = [],
  dashboardSummary = null
}) => {
  const { getFieldLabel } = useLabels();
  const categoryLabel = getFieldLabel('task.category', 'Category');
  
  const stats = useMemo(() => {
    const regularTasks = tasks.filter(t => !t.vendor || t.vendor.trim() === '');
    const pendingTasks = dashboardSummary ? dashboardSummary.pendingSimpleTasks ?? 0 : '...';
    return { pendingTasks };
  }, [tasks, dashboardSummary]);

  const pendingRecurringTasks = useMemo(() => {
    if (!dashboardSummary) return '...';
    if (typeof dashboardSummary.pendingRecurringTasks === 'number') return dashboardSummary.pendingRecurringTasks;

    const parseRecurringDate = (value: string): Date | null => {
      const raw = String(value || '').trim();
      const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      const date = match
        ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
        : new Date(raw);
      if (isNaN(date.getTime())) return null;
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const clampDay = (year: number, monthIndex: number, day: number): Date => {
      const maxDay = new Date(year, monthIndex + 1, 0).getDate();
      const date = new Date(year, monthIndex, Math.min(Math.max(day, 1), maxDay));
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const getLastCompletionDate = (task: RecurringTask): string => {
      const taskHistory = recurringActions
        .filter(a => Number(a.taskId) === Number(task.id) && a.status === 'Complete')
        .sort((a, b) => (parseRecurringDate(b.updatedOn)?.getTime() || 0) - (parseRecurringDate(a.updatedOn)?.getTime() || 0));
      return taskHistory.length > 0 ? taskHistory[0].updatedOn : task.startDate;
    };

    const getNextDueDate = (task: RecurringTask): Date | null => {
      const lastComplete = parseRecurringDate(getLastCompletionDate(task));
      if (!lastComplete) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const periodicity = task.periodicity || 'Fixed Days';

      if (periodicity === 'Fixed Days') {
        const interval = Math.max(1, Number(task.frequencyDays || 30));
        const nextDate = new Date(lastComplete);
        do {
          nextDate.setDate(nextDate.getDate() + interval);
        } while (nextDate < today);
        nextDate.setHours(0, 0, 0, 0);
        return nextDate;
      }

      if (periodicity === 'Weekly') {
        const targetDay = Number(task.recurrenceDay ?? 0);
        let diff = targetDay - lastComplete.getDay();
        if (diff <= 0) diff += 7;
        const nextDate = new Date(lastComplete);
        nextDate.setDate(lastComplete.getDate() + diff);
        while (nextDate < today) nextDate.setDate(nextDate.getDate() + 7);
        nextDate.setHours(0, 0, 0, 0);
        return nextDate;
      }

      if (periodicity === 'Monthly') {
        const targetDay = Number(task.recurrenceDay ?? 1);
        let monthsToAdd = 0;
        while (true) {
          const nextDate = clampDay(lastComplete.getFullYear(), lastComplete.getMonth() + monthsToAdd, targetDay);
          if (nextDate > lastComplete && nextDate >= today) return nextDate;
          monthsToAdd++;
        }
      }

      if (periodicity === 'Yearly') {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const targetMonthIndex = Math.max(0, months.indexOf(task.recurrenceMonth || 'January'));
        const targetDay = Number(task.recurrenceDay ?? 1);
        let yearsToAdd = 0;
        while (true) {
          const nextDate = clampDay(lastComplete.getFullYear() + yearsToAdd, targetMonthIndex, targetDay);
          if (nextDate > lastComplete && nextDate >= today) return nextDate;
          yearsToAdd++;
        }
      }

      return null;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return recurringTasks.filter(task => {
      const nextDue = getNextDueDate(task);
      if (!nextDue) return false;
      return task.status !== 'Complete' && today >= nextDue;
    }).length;
  }, [recurringActions, recurringTasks, dashboardSummary]);

  const dynamicLiveStatuses = useMemo(() => {
    const baseStatuses = statuses
      .map(s => String(s.name || '').trim())
      .filter(Boolean);
    const taskStatuses = Array.from(new Set(tasks.map(t => String(t.status || '').trim()).filter(Boolean)));
    const merged = Array.from(new Set([...baseStatuses, ...taskStatuses]));
    return merged.filter(s => !['completed', 'not yet started', 'in progress', 'started'].includes(s.toLowerCase()));
  }, [statuses, tasks]);

  const dynamicLiveStatusCounts = useMemo(() => {
    const regularTasks = tasks.filter(t => !t.vendor || t.vendor.trim() === '');
    const countMap: Record<string, number> = {};
    dynamicLiveStatuses.forEach(status => {
      countMap[status] = regularTasks.filter(t => String(t.status || '').trim().toLowerCase() === status.toLowerCase()).length;
    });
    return countMap;
  }, [tasks, dynamicLiveStatuses]);

  const employeePendingTasks = useMemo(() => {
    return tasks
      .filter(task => (!task.vendor || task.vendor.trim() === '') && task.status !== 'Completed')
      .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  }, [tasks]);

  const employeePendingRecurringTasks = useMemo(() => {
    const timeValue = (value?: string) => {
      const raw = String(value || '').trim();
      if (!raw) return '99:99';
      const match = raw.match(/^(\d{1,2}):(\d{2})/);
      if (!match) return raw;
      return match[1].padStart(2, '0') + ':' + match[2];
    };

    return recurringTasks
      .filter(task => String(task.status || '').trim().toLowerCase() !== 'complete')
      .sort((a, b) => {
        const byTime = timeValue(a.time).localeCompare(timeValue(b.time));
        if (byTime !== 0) return byTime;
        return String(a.startDate || '').localeCompare(String(b.startDate || ''));
      });
  }, [recurringTasks]);

  const isPastDue = (dateValue?: string) => {
    const iso = parseToISO(dateValue || '');
    if (!iso) return false;
    const today = new Date().toLocaleDateString('en-CA');
    return iso < today;
  };

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

  const dailyKraRows = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseDDMMYYYY = (value?: string): Date | null => {
      const raw = String(value || '').trim();
      if (!raw) return null;
      const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (match) {
        const d = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const y = parseInt(match[3], 10);
        const dt = new Date(y, m - 1, d);
        if (isNaN(dt.getTime())) return null;
        dt.setHours(0, 0, 0, 0);
        return dt;
      }
      const dt = new Date(raw);
      if (isNaN(dt.getTime())) return null;
      dt.setHours(0, 0, 0, 0);
      return dt;
    };

    const clampDay = (year: number, monthIndex: number, day: number): Date => {
      const maxDay = new Date(year, monthIndex + 1, 0).getDate();
      const safeDay = Math.min(Math.max(day, 1), maxDay);
      const date = new Date(year, monthIndex, safeDay);
      date.setHours(0, 0, 0, 0);
      return date;
    };

    const getLastCompletionDateStr = (taskId: number, startDate: string): string => {
      const history = recurringActions
        .filter(a => Number(a.taskId) === taskId && String(a.status || '') === 'Complete')
        .sort((a, b) => {
          const da = parseDDMMYYYY(String(a.updatedOn || ''))?.getTime() || 0;
          const db = parseDDMMYYYY(String(b.updatedOn || ''))?.getTime() || 0;
          return db - da;
        });
      return history.length > 0 ? String(history[0].updatedOn || '') : startDate;
    };

    const getNextDueDateObject = (task: any): Date | null => {
      const periodicity = String(task.periodicity || task.frequencyType || 'Fixed Days').trim() || 'Fixed Days';
      const taskId = Number(task.id || 0);
      if (!taskId) return null;

      const anchorStr = getLastCompletionDateStr(taskId, String(task.startDate || ''));
      const anchor = parseDDMMYYYY(anchorStr);
      if (!anchor) return null;
      anchor.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (periodicity === 'Fixed Days') {
        const frequencyDays = Math.max(1, Number(task.frequencyDays || 1));
        const next = new Date(anchor);
        do {
          next.setDate(next.getDate() + frequencyDays);
        } while (next < today);
        next.setHours(0, 0, 0, 0);
        return next;
      }

      if (periodicity === 'Weekly') {
        const targetDay = typeof task.recurrenceDay === 'number' ? task.recurrenceDay : Number(task.recurrenceDay || 0);
        let diff = targetDay - anchor.getDay();
        if (diff <= 0) diff += 7;
        const next = new Date(anchor);
        next.setDate(anchor.getDate() + diff);
        while (next < today) {
          next.setDate(next.getDate() + 7);
        }
        next.setHours(0, 0, 0, 0);
        return next;
      }

      if (periodicity === 'Monthly') {
        const targetDay = typeof task.recurrenceDay === 'number' ? task.recurrenceDay : Number(task.recurrenceDay || 1);
        let monthsToAdd = 0;
        let next;
        do {
          next = clampDay(anchor.getFullYear(), anchor.getMonth() + monthsToAdd, targetDay);
          if (next <= anchor || next < today) {
            monthsToAdd++;
          } else {
            break;
          }
        } while (true);
        return next;
      }

      if (periodicity === 'Yearly') {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const targetMonthIdx = Math.max(0, months.indexOf(String(task.recurrenceMonth || 'January')));
        const targetDay = typeof task.recurrenceDay === 'number' ? task.recurrenceDay : Number(task.recurrenceDay || 1);
        let yearsToAdd = 0;
        let next;
        do {
          next = clampDay(anchor.getFullYear() + yearsToAdd, targetMonthIdx, targetDay);
          if (next <= anchor || next < today) {
            yearsToAdd++;
          } else {
            break;
          }
        } while (true);
        return next;
      }

      return null;
    };

    const tasksRelevantToday = recurringTasks.filter(task => {
      const nextDue = getNextDueDateObject(task);
      const isDueToday = nextDue && (nextDue.setHours(0, 0, 0, 0) === today.getTime());

      const hasActionsToday = recurringActions.some(
        a => Number(a.taskId) === Number(task.id) && parseToISO(a.updatedOn) === isoToday
      );

      return isDueToday || hasActionsToday;
    });

    const byEmployeeKRA = new Map<string, { goal: number; achieved: number }>();
    const byEmployeeDaily = new Map<string, { goal: number; achieved: number }>();

    tasksRelevantToday.forEach(task => {
      const employeeName = String(task.assignee || '-').trim() || '-';
      const rawGoal = Number(task.goal || 0);
      const effectiveGoal = rawGoal > 0 ? rawGoal : 1;

      const actionsToday = recurringActions.filter(
        a => Number(a.taskId) === Number(task.id) && parseToISO(a.updatedOn) === isoToday
      );
      const achievedFromActions = actionsToday.reduce((sum, a) => sum + Number(a.goal || 0), 0);

      const hasCompletionToday = actionsToday.some(a => String(a.status || '') === 'Complete');
      const effectiveAchieved = rawGoal > 0 ? achievedFromActions : (hasCompletionToday ? 1 : 0);

      const isDailyOneDay = (task.periodicity === 'Fixed Days' || task.frequencyType === 'Fixed Days') && Number(task.frequencyDays) === 1;

      // KRA Tracker now includes ALL relevant tasks (including Daily)
      if (!byEmployeeKRA.has(employeeName)) byEmployeeKRA.set(employeeName, { goal: 0, achieved: 0 });
      const kraData = byEmployeeKRA.get(employeeName)!;
      kraData.goal += effectiveGoal;
      kraData.achieved += effectiveAchieved;

      // Daily KRA Tracker still shows only 1-day tasks
      if (isDailyOneDay) {
        if (!byEmployeeDaily.has(employeeName)) byEmployeeDaily.set(employeeName, { goal: 0, achieved: 0 });
        const dailyData = byEmployeeDaily.get(employeeName)!;
        dailyData.goal += effectiveGoal;
        dailyData.achieved += effectiveAchieved;
      }
    });

    const formatRows = (map: Map<string, { goal: number; achieved: number }>) => {
      return Array.from(map.entries()).map(([employeeName, data]) => ({
        employeeName,
        goal: data.goal,
        achieved: data.achieved,
        achievedPercent: data.goal > 0 ? ((data.achieved / data.goal) * 100).toFixed(0) + '%' : '0%'
      }));
    };

    return { kraRows: formatRows(byEmployeeKRA), dailyRows: formatRows(byEmployeeDaily) };
  }, [recurringTasks, recurringActions, isoToday]);

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
		            <QuickAction label="Simple Task" icon={<Plus size={18} />} colorClass="bg-blue-600 hover:bg-blue-700 text-white" onClick={onOpenNewTask}/>
		            <QuickAction label="New Recurring Task" icon={<RotateCcw size={18} />} colorClass="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onOpenNewRecurringTask}/>
	            <QuickAction label="Add User" icon={<UserPlus size={18} />} colorClass="bg-indigo-500 hover:bg-indigo-600 text-white" onClick={onOpenAddUser}/>
              <QuickAction label={`Add ${categoryLabel}`} icon={<Tags size={18} />} colorClass="bg-violet-500 hover:bg-violet-600 text-white" onClick={onOpenAddCategory}/>
	            {VENDOR_MODULE_ENABLED && (
	              <QuickAction label="Add Vendor" icon={<Truck size={18} />} colorClass="bg-orange-500 hover:bg-orange-600 text-white" onClick={onOpenAddVendor}/>
	            )}
	          </div>
	        </div>
	      )}

      {isAdmin && (
        <div className="bg-blue-50/70 p-6 rounded-2xl border-2 border-blue-300 shadow-sm">
          <SectionHeader title="Live Statistics" icon={<Clock size={20}/>} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Pending Simple Tasks" value={stats.pendingTasks} icon={<Clock size={20}/>} iconBgColor="bg-amber-100" iconColor="text-amber-600" onClick={() => onNavigate('pending')}/>
            <StatCard title="Pending Recurring Tasks" value={pendingRecurringTasks} icon={<RotateCcw size={20}/>} iconBgColor="bg-emerald-100" iconColor="text-emerald-600" onClick={() => onNavigate('due-recurring-tasks')}/>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-emerald-50 pb-2">
              <RotateCcw size={18} className="text-emerald-600" />
              <h4 className="text-sm font-black text-emerald-900 uppercase">Pending Recurring Tasks ({employeePendingRecurringTasks.length})</h4>
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {employeePendingRecurringTasks.map(task => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-emerald-100 bg-emerald-50/20 rounded-xl shadow-sm">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 uppercase break-words">{task.title}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] font-bold text-gray-500 uppercase">
                      <span>Goal: {task.goal || 0}</span>
                      <span>Completed: {(task as any).achieved || 0}</span>
                      {task.time && <span>Time: {task.time}</span>}
                    </div>
                  </div>
                  <button onClick={() => onUpdateRecurringTask(task)} className="shrink-0 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 uppercase shadow-sm">
                    Update
                  </button>
                </div>
              ))}
              {employeePendingRecurringTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <Clock size={32} className="text-gray-300 mb-2" />
                  <p className="text-[10px] text-gray-500 italic text-center uppercase font-bold tracking-widest">No pending recurring tasks</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border-2 border-amber-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-amber-50 pb-2">
              <CheckSquare size={18} className="text-amber-600" />
              <h4 className="text-sm font-black text-amber-900 uppercase">Pending Simple Tasks ({employeePendingTasks.length})</h4>
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {employeePendingTasks.map(task => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-amber-100 bg-amber-50/20 rounded-xl shadow-sm">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 uppercase break-words">{task.title}</p>
                    {task.remarks && <p className="text-[10px] font-bold text-gray-500 uppercase mt-1 break-words">{task.remarks}</p>}
                    <p className={`text-[10px] font-black uppercase mt-1 ${isPastDue(task.dueDate) ? 'text-red-600' : 'text-gray-500'}`}>Due: {task.dueDate || '-'}</p>
                  </div>
                  <button onClick={() => onUpdateTask(task)} className="shrink-0 px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-lg hover:bg-blue-700 uppercase shadow-sm">
                    Update
                  </button>
                </div>
              ))}
              {employeePendingTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <Clock size={32} className="text-gray-300 mb-2" />
                  <p className="text-[10px] text-gray-500 italic text-center uppercase font-bold tracking-widest">No pending simple tasks</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
      <div className="space-y-6">
        <SectionHeader title="Today's Activity" icon={<History size={20}/>} />
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

	           {VENDOR_MODULE_ENABLED && (
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
	           )}

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
          <div className="bg-white p-5 rounded-2xl border-2 border-sky-200 shadow-sm col-span-1 md:col-span-3">
	          <div className="flex flex-col md:flex-row gap-6">
              {/* KRA Tracker */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4 border-b border-sky-50 pb-2">
                  <History size={18} className="text-sky-600" />
                  <h4 className="text-sm font-black text-sky-900 uppercase">KRA Tracker</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-sky-600">
                        <th className="px-4 py-2 text-[10px] font-bold text-white uppercase">Employee Name</th>
                        <th className="px-4 py-2 text-[10px] font-bold text-white uppercase text-center">Goal</th>
                        <th className="px-4 py-2 text-[10px] font-bold text-white uppercase text-center">Achieved</th>
                        <th className="px-4 py-2 text-[10px] font-bold text-white uppercase text-center">Achieved%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyKraRows.kraRows.map((row, idx) => (
                        <tr key={`${row.employeeName}-${idx}`} className="border-b border-sky-100 hover:bg-sky-50 transition-colors">
                          <td className="px-4 py-2 text-xs font-bold text-gray-800">{row.employeeName}</td>
                          <td className="px-4 py-2 text-xs font-black text-blue-700 text-center">{row.goal}</td>
                          <td className="px-4 py-2 text-xs font-black text-blue-700 text-center">{row.achieved}</td>
                          <td className="px-4 py-2 text-xs font-black text-blue-800 text-center bg-blue-50">{row.achievedPercent}</td>
                        </tr>
                      ))}
                      {dailyKraRows.kraRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-500 uppercase font-bold tracking-widest">No recurring tasks found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily KRA Tracker (1-day interval) */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4 border-b border-indigo-50 pb-2">
                  <RotateCcw size={18} className="text-indigo-600" />
                  <h4 className="text-sm font-black text-indigo-900 uppercase">Daily KRA Tracker</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-indigo-600">
                        <th className="px-4 py-2 text-[10px] font-bold text-white uppercase">Employee Name</th>
                        <th className="px-4 py-2 text-[10px] font-bold text-white uppercase text-center">Goal</th>
                        <th className="px-4 py-2 text-[10px] font-bold text-white uppercase text-center">Achieved</th>
                        <th className="px-4 py-2 text-[10px] font-bold text-white uppercase text-center">Achieved%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyKraRows.dailyRows.map((row, idx) => (
                        <tr key={`${row.employeeName}-${idx}`} className="border-b border-indigo-100 hover:bg-indigo-50 transition-colors">
                          <td className="px-4 py-2 text-xs font-bold text-gray-800">{row.employeeName}</td>
                          <td className="px-4 py-2 text-xs font-black text-indigo-700 text-center">{row.goal}</td>
                          <td className="px-4 py-2 text-xs font-black text-indigo-700 text-center">{row.achieved}</td>
                          <td className="px-4 py-2 text-xs font-black text-indigo-800 text-center bg-indigo-50">{row.achievedPercent}</td>
                        </tr>
                      ))}
                      {dailyKraRows.dailyRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-500 uppercase font-bold tracking-widest">No daily tasks found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
	        </div>
	        </div>
	      </div>
      )}

    </div>
  );
};

