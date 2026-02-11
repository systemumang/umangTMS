import React, { useState } from 'react';
import { LayoutGrid, LayoutList } from 'lucide-react';
import { TableRow } from '../types';

interface PendingTableProps {
  title: string;
  headerLabel: string;
  data: TableRow[];
  onRowClick: (name: string) => void;
  className?: string;
}

export const PendingTable: React.FC<PendingTableProps> = ({ title, headerLabel, data, onRowClick, className = '' }) => {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  return (
    <div className={`${className || 'bg-white'} rounded-xl shadow-sm border-2 border-blue-400 overflow-hidden`}>
      <div className="p-4 md:p-6 border-b border-blue-200 flex justify-between items-center">
        <h3 className="text-lg font-bold text-blue-700 uppercase tracking-tight">{title}</h3>
        
        {/* Mobile Toggle */}
        <div className="flex bg-blue-50 p-1 rounded-lg md:hidden border border-blue-200">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-md transition-all border ${viewMode === 'card' ? 'bg-white shadow text-blue-600 border-blue-600' : 'text-blue-400 border-transparent'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all border ${viewMode === 'table' ? 'bg-white shadow text-blue-600 border-blue-600' : 'text-blue-400 border-transparent'}`}
            >
              <LayoutList size={16} />
            </button>
        </div>
      </div>
      
      {/* Desktop Table / Mobile Table View */}
      <div className={`overflow-x-auto ${viewMode === 'card' ? 'hidden md:block' : 'block'}`}>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest border-r border-blue-700 last:border-r-0">{headerLabel}</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center border-r border-blue-700 last:border-r-0">Total Pending</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center border-r border-blue-700 last:border-r-0">Not Started</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center border-r border-blue-700 last:border-r-0">In Progress</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center border-r border-blue-700 last:border-r-0">Pending Client</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center border-r border-blue-700 last:border-r-0">Pending Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {data.length > 0 ? (
              data.map((row, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  onClick={() => onRowClick(row.name)}
                >
                  <td className="px-6 py-4 text-sm text-black font-bold border-r border-blue-50 last:border-r-0">{row.name}</td>
                  <td className="px-6 py-4 text-sm text-black text-center font-bold border-r border-blue-50 last:border-r-0">{row.total}</td>
                  <td className="px-6 py-4 text-sm text-red-600 text-center font-extrabold border-r border-blue-50 last:border-r-0">{row.notStarted}</td>
                  <td className="px-6 py-4 text-sm text-green-600 text-center font-extrabold border-r border-blue-50 last:border-r-0">{row.inProgress}</td>
                  <td className="px-6 py-4 text-sm text-purple-600 text-center font-extrabold border-r border-blue-50 last:border-r-0">{row.pendingClient}</td>
                  <td className="px-6 py-4 text-sm text-indigo-600 text-center font-extrabold border-r border-blue-50 last:border-r-0">{row.pendingOwner}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-blue-900/40 text-sm font-bold uppercase">
                  No pending data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className={`p-4 space-y-3 md:hidden ${viewMode === 'card' ? 'block' : 'hidden'}`}>
        {data.length > 0 ? (
            data.map((row, idx) => (
                <div 
                    key={idx} 
                    onClick={() => onRowClick(row.name)}
                    className="bg-white/80 border-2 border-blue-200 rounded-lg p-4 shadow-sm active:bg-blue-50 transition-colors cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h4 className="text-base font-bold text-blue-800">{row.name}</h4>
                        </div>
                        <div className="bg-blue-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            {row.total}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-100">
                        <div className="text-center p-2 bg-red-50 border-2 border-red-300 rounded-lg">
                            <div className="text-[9px] font-bold text-red-400 uppercase tracking-tighter mb-0.5">Not Started</div>
                            <div className="font-black text-red-600">{row.notStarted}</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 border-2 border-green-900 rounded-lg">
                            <div className="text-[9px] font-bold text-green-900 uppercase tracking-tighter mb-0.5">In Progress</div>
                            <div className="font-black text-green-900">{row.inProgress}</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 border-2 border-purple-300 rounded-lg">
                            <div className="text-[9px] font-bold text-purple-400 uppercase tracking-tighter mb-0.5">For Client</div>
                            <div className="font-black text-purple-600">{row.pendingClient}</div>
                        </div>
                        <div className="text-center p-2 bg-indigo-50 border-2 border-indigo-300 rounded-lg">
                            <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter mb-0.5">For Owner</div>
                            <div className="font-black text-indigo-600">{row.pendingOwner}</div>
                        </div>
                    </div>
                </div>
            ))
        ) : (
            <div className="text-center py-6 text-blue-400 text-sm font-bold uppercase">
                No pending tasks.
            </div>
        )}
      </div>
    </div>
  );
};