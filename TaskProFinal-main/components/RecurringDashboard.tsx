import React, { useMemo } from 'react';
import { RecurringTask, RecurringTaskAction, User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle, Clock, AlertCircle, Users } from 'lucide-react';

interface RecurringDashboardProps {
  tasks: RecurringTask[];
  actions: RecurringTaskAction[];
  users: User[];
}

export const RecurringDashboard: React.FC<RecurringDashboardProps> = ({ tasks, actions, users }) => {
  const performanceData = useMemo(() => {
    const map = new Map<string, { name: string; total: number; complete: number; inProgress: number; notStarted: number }>();
    
    // Initialize map with active users
    users.filter(u => u.isActive).forEach(user => {
      map.set(user.name, { name: user.name, total: 0, complete: 0, inProgress: 0, notStarted: 0 });
    });

    // Count tasks per assignee
    tasks.forEach(task => {
      if (!map.has(task.assignee)) {
        map.set(task.assignee, { name: task.assignee, total: 0, complete: 0, inProgress: 0, notStarted: 0 });
      }
      
      const stats = map.get(task.assignee)!;
      stats.total += 1;
      
      if (task.status === 'Complete') stats.complete += 1;
      else if (task.status === 'In Progress') stats.inProgress += 1;
      else stats.notStarted += 1;
    });

    return Array.from(map.values()).filter(d => d.total > 0);
  }, [tasks, users]);

  const globalStats = useMemo(() => {
    const total = tasks.length;
    const complete = tasks.filter(t => t.status === 'Complete').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const notStarted = tasks.filter(t => t.status === 'Not Yet Started' || !t.status).length;
    
    return { total, complete, inProgress, notStarted };
  }, [tasks]);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-indigo-600">Recurring Tasks Performance</h2>
        <p className="text-sm text-gray-600 mt-1">Measure employee efficiency on periodic tasks</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Recurring Tasks</p>
            <p className="text-2xl font-bold text-black">{globalStats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 rounded-full text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Cycle Completed</p>
            <p className="text-2xl font-bold text-black">{globalStats.complete}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Currently In Progress</p>
            <p className="text-2xl font-bold text-black">{globalStats.inProgress}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-full text-orange-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Not Started Yet</p>
            <p className="text-2xl font-bold text-black">{globalStats.notStarted}</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Employee-wise Task Status</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="complete" name="Complete" stackId="a" fill="#10B981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="notStarted" name="Not Started" stackId="a" fill="#9CA3AF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top Performers</h3>
          <div className="flex-1 overflow-y-auto space-y-4">
            {performanceData
              .sort((a, b) => b.complete - a.complete)
              .map((employee, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{employee.name}</p>
                      <p className="text-xs text-gray-500">{employee.total} Total Tasks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{Math.round((employee.complete / employee.total) * 100)}%</p>
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Completion</p>
                  </div>
                </div>
              ))}
              {performanceData.length === 0 && <p className="text-sm text-gray-500 text-center py-10">No performance data available yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};