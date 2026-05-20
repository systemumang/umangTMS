import React, { useState } from 'react';
import { LayoutGrid, LayoutList } from 'lucide-react';
import { TableRow } from '../types';

interface PendingTableProps {
  title: string;
  headerLabel: string;
  data: TableRow[];
  onRowClick: (name: string) => void;
  className?: string;
  statusColumns?: string[];
}

export const PendingTable: React.FC<PendingTableProps> = ({ title, headerLabel, data, onRowClick, className = '', statusColumns = [] }) => {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const columns = statusColumns.length > 0 ? statusColumns : ['Not Yet Started', 'In Progress', 'Pending for Client', 'Pending for Owner', 'Pending for Training', 'Pending for Billing', 'Pending for Payment'];
  const labelize = (status: string) => status.replace(/^Pending for\s+/i, '');

  return (
    <div className={`${className || 'bg-white'} rounded-xl shadow-sm border-2 border-black overflow-hidden`}>
      <div className="p-4 md:p-6 border-b border-black flex justify-between items-center">
        <h3 className="text-lg font-bold text-blue-700 uppercase tracking-tight">{title}</h3>
        
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
      
      <div className={`overflow-x-auto ${viewMode === 'card' ? 'hidden md:block' : 'block'}`}>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest border-r border-black last:border-r-0">{headerLabel}</th>
              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center border-r border-black last:border-r-0">Total Pending</th>
              {columns.map((column) => (
                <th key={column} className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-center border-r border-black last:border-r-0">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {data.length > 0 ? (
              data.map((row, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  onClick={() => onRowClick(row.name)}
                >
                  <td className="px-6 py-4 text-sm text-black font-bold border-r border-black last:border-r-0">{row.name}</td>
                  <td className="px-6 py-4 text-sm text-black text-center font-bold border-r border-black last:border-r-0">{row.total}</td>
                  {columns.map((column) => (
                    <td key={`${row.name}-${column}`} className="px-6 py-4 text-sm text-center font-extrabold border-r border-black last:border-r-0 text-blue-700">
                      {row.statusCounts?.[column] || 0}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2 + columns.length} className="px-6 py-10 text-center text-blue-900/40 text-sm font-bold uppercase">
                  No pending data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
                    
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-black">
                        {columns.map((column) => (
                          <div key={`${row.name}-m-${column}`} className="text-center p-2 bg-blue-50 border-2 border-blue-200 rounded-lg">
                              <div className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter mb-0.5">{labelize(column)}</div>
                              <div className="font-black text-blue-800">{row.statusCounts?.[column] || 0}</div>
                          </div>
                        ))}
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

