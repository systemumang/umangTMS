import React, { useState, useMemo } from 'react';
import { ActionLogEntry, User } from '../types';
import { parseToISO, formatToIndianDate } from '../App';
import { X } from 'lucide-react';

interface ActivityDashboardViewProps {
  logs: ActionLogEntry[];
  users: User[];
  currentUser: User | null;
}

export const ActivityDashboardView: React.FC<ActivityDashboardViewProps> = ({ logs, users, currentUser }) => {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
  const todayISO = now.toLocaleDateString('en-CA');
  
  const [fromDate, setFromDate] = useState(firstDayOfMonth);
  const [toDate, setToDate] = useState(todayISO);

  const isAdmin = currentUser?.role === 'Admin';

  const formatMinutesToHHMM = (totalMinutes: number) => {
    if (!totalMinutes || totalMinutes <= 0) return '';
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const pivotedData = useMemo(() => {
    const filteredLogs = logs.filter(log => {
      const logISO = parseToISO(log.updateDate);
      if (fromDate && logISO < fromDate) return false;
      if (toDate && logISO > todayISO) return false; // Use todayISO for logical cap or just toDate
      if (toDate && logISO > toDate) return false;
      return true;
    });

    const datesMap = new Map<string, Map<string, number>>();
    const employeesSet = new Set<string>();

    if (isAdmin) {
      users.filter(u => u.role !== 'Admin').forEach(u => employeesSet.add(u.name));
    } else if (currentUser) {
      employeesSet.add(currentUser.name);
    }

    filteredLogs.forEach(log => {
      const dateStr = formatToIndianDate(log.updateDate);
      const names = (log.assignees || log.owner || 'Unknown')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      names.forEach(name => {
        if (employeesSet.has(name)) {
            if (!datesMap.has(dateStr)) {
                datesMap.set(dateStr, new Map());
            }
            const employeeMap = datesMap.get(dateStr)!;
            const currentMinutes = employeeMap.get(name) || 0;
            employeeMap.set(name, currentMinutes + (log.hours || 0));
        }
      });
    });

    const sortedDates = Array.from(datesMap.keys()).sort((a, b) => {
      const parse = (ds: string) => {
        const [d, m, y] = ds.split('/');
        return new Date(`${y}-${m}-${d}`).getTime();
      };
      return parse(a) - parse(b);
    });

    const sortedEmployees = Array.from(employeesSet).sort((a, b) => a.localeCompare(b));

    return {
      dates: sortedDates,
      employees: sortedEmployees,
      data: datesMap
    };
  }, [logs, fromDate, toDate, users, isAdmin, currentUser]);

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    pivotedData.employees.forEach(emp => {
      let sum = 0;
      pivotedData.dates.forEach(date => {
        sum += pivotedData.data.get(date)?.get(emp) || 0;
      });
      totals[emp] = sum;
    });
    return totals;
  }, [pivotedData]);

  const thClass = "px-6 py-4 border border-black bg-[#4a77d4] text-white font-black text-center text-xs whitespace-nowrap uppercase tracking-widest";
  const tdClass = "px-6 py-4 border border-black text-center text-sm font-black text-gray-800 h-14";
  const labelClass = "text-[10px] font-black bg-[#4a77d4] text-white px-4 py-2 rounded-l-md uppercase tracking-widest border border-[#4a77d4] flex items-center h-[44px] whitespace-nowrap";

  return (
    <div className="space-y-6 pb-12">
      {/* Date Filters */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-row items-center justify-center gap-6 flex-wrap">
        <div className="flex flex-row items-center">
          <label className={labelClass}>From Date</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[170px] px-4 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg focus:ring-4 focus:ring-blue-50 focus:border-[#4a77d4] outline-none transition-all font-bold text-gray-700 shadow-sm text-center h-[44px]"
          />
        </div>
        <div className="flex flex-row items-center">
          <label className={labelClass}>To Date</label>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[170px] px-4 py-2 border-2 border-l-0 border-gray-200 rounded-r-lg focus:ring-4 focus:ring-blue-50 focus:border-[#4a77d4] outline-none transition-all font-bold text-gray-700 shadow-sm text-center h-[44px]"
          />
        </div>
        <button 
          onClick={() => { setFromDate(''); setToDate(''); }}
          className="px-6 py-2.5 bg-gray-100 text-gray-600 font-black rounded-xl hover:bg-gray-200 transition-all uppercase text-xs border-2 border-gray-200 h-[44px] flex items-center gap-2 shadow-sm active:scale-95"
        >
          <X size={14} />
          Clear
        </button>
      </div>

      {/* Main Activity Table */}
      <div className="bg-white p-2 rounded-2xl shadow-lg overflow-hidden border-2 border-blue-100">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full border-collapse border border-black table-fixed min-w-max">
            <thead>
              <tr>
                <th className={thClass} style={{ width: '200px' }}>DATE</th>
                {pivotedData.employees.map(emp => (
                  <th key={emp} className={thClass}>{emp}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black bg-white">
              {[...pivotedData.dates].reverse().map(date => (
                <tr key={date} className="hover:bg-blue-50/30 transition-colors">
                  <td className={tdClass}>{date}</td>
                  {pivotedData.employees.map(emp => {
                    const value = pivotedData.data.get(date)?.get(emp) || 0;
                    return (
                      <td key={`${date}-${emp}`} className={tdClass}>
                        {formatMinutesToHHMM(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {pivotedData.dates.length === 0 && (
                <tr>
                  <td colSpan={pivotedData.employees.length + 1} className="px-6 py-24 text-center text-gray-400 italic font-black uppercase tracking-widest text-xs">
                    No activity logs found for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
            {pivotedData.dates.length > 0 && (
              <tfoot>
                <tr className="bg-[#4a77d4] text-white border-t-2 border-black">
                  <td className="px-6 py-4 border border-black font-black text-sm uppercase tracking-widest text-center">TOTAL</td>
                  {pivotedData.employees.map(emp => (
                    <td key={`total-${emp}`} className="px-6 py-4 border border-black text-center font-black text-sm">
                      {formatMinutesToHHMM(columnTotals[emp])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};