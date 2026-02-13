import React, { useState } from 'react';
import { X, Download, Calendar, User, Users, Clock, Tag, Briefcase, History, Building2, Hammer, LayoutGrid, LayoutList } from 'lucide-react';
import { ActionLogEntry, Task } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatToIndianDate, formatToIndianDateTime } from '../App';

interface TaskHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  logs: ActionLogEntry[];
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({ isOpen, onClose, task, logs }) => {
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  if (!isOpen || !task) return null;

  const taskLogs = logs.filter(log => {
    const logTaskId = Number(log.taskId || 0);
    const currentTaskId = Number(task.id || 0);
    return logTaskId > 0 && logTaskId === currentTaskId;
  }).sort((a, b) => { // Sort logs by updateDate descending
    const dateA = new Date(a.updateDate.replace(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) (AM|PM)/, '$3-$2-$1 $4:$5 $6'));
    const dateB = new Date(b.updateDate.replace(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}) (AM|PM)/, '$3-$2-$1 $4:$5 $6'));
    return dateB.getTime() - dateA.getTime();
  });
  
  const isVendorTask = !!(task.vendor && task.vendor.trim() !== '');
  
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Task History', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Updates for: ${task.title}`, 14, 30);
    doc.setFontSize(10);
    doc.text(`Project: ${task.project.split(' (')[0]} | Client: ${task.clientName || '-'}`, 14, 36);

    let tableColumn: string[] = ["Task Date", "Update Date", "Status", "Remarks", "Owner", "Project", "Client"];
    let tableRows: any[] = [];

    if (isVendorTask) {
        tableColumn.push("Vendor");
        tableColumn.push("Minutes");
        tableRows = taskLogs.map(log => [
            formatToIndianDate(log.taskDate),
            formatToIndianDate(log.updateDate),
            log.status,
            log.remarks || '-',
            log.owner,
            log.project.split(' (')[0],
            log.clientName || '-',
            log.vendor || '-',
            log.hours || 0
        ]);
    } else {
        tableColumn.push("Assignees");
        tableColumn.push("Minutes");
        tableRows = taskLogs.map(log => [
            formatToIndianDate(log.taskDate),
            formatToIndianDate(log.updateDate),
            log.status,
            log.remarks || '-',
            log.owner,
            log.project.split(' (')[0],
            log.clientName || '-',
            log.assignees,
            log.hours || 0
        ]);
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45, 
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Task_History_${task.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 border-2 border-blue-500">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-blue-600">Task Details & History</h2>
            <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-3">
                   <span className="text-sm font-bold text-black">{task.title}</span>
                   <button onClick={handleDownloadPDF} className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow-sm">
                      <Download size={16} />
                   </button>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto p-4 md:p-6 space-y-6">
          {/* Detailed History Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-black uppercase tracking-widest flex items-center gap-2">
                 <History className="text-blue-500" size={16} /> UPDATE HISTORY LOG
              </h3>
              <div className="flex bg-blue-50 p-1 rounded-lg border border-blue-200">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-white shadow text-blue-600' : 'text-blue-400 hover:text-blue-500'}`}
                    title="Card View"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-blue-400 hover:text-blue-500'}`}
                    title="Table View"
                  >
                    <LayoutList size={18} />
                  </button>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className={`${viewMode === 'card' ? 'grid md:hidden' : 'hidden'} grid-cols-1 gap-4`}>
              {taskLogs.map((log) => (
                <div key={log.id} className="bg-white border-2 border-blue-100 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex justify-between items-start border-b border-blue-50 pb-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">Update Date</span>
                      <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                        <Clock size={12} className="text-blue-500" />
                        {formatToIndianDate(log.updateDate)}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                      {log.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div className="space-y-0.5">
                      <span className="text-gray-400 font-bold uppercase block">Task Date</span>
                      <span className="font-bold text-black flex items-center gap-1">
                        <Calendar size={10} className="text-gray-400" />
                        {formatToIndianDate(log.taskDate)}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-gray-400 font-bold uppercase block">Minutes</span>
                      <span className="font-black text-indigo-600">{log.hours || 0}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-gray-400 font-bold uppercase block">Owner</span>
                      <span className="font-bold text-black uppercase flex items-center gap-1">
                        <User size={10} className="text-gray-400" />
                        {log.owner}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-gray-400 font-bold uppercase block">{isVendorTask ? 'Vendor' : 'Assignee'}</span>
                      <span className="font-bold text-black uppercase flex items-center gap-1">
                        {isVendorTask ? <Hammer size={10} className="text-orange-400" /> : <Users size={10} className="text-gray-400" />}
                        {isVendorTask ? log.vendor : log.assignees}
                      </span>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-50">
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Remarks</span>
                    <p className="text-[11px] text-blue-800 italic leading-relaxed whitespace-normal break-words">"{log.remarks}"</p>
                  </div>
                </div>
              ))}
              {taskLogs.length === 0 && (
                <div className="text-center py-12 text-black font-bold opacity-40 uppercase tracking-widest text-xs bg-gray-50/20 rounded-xl">
                  No update history found.
                </div>
              )}
            </div>

            {/* Desktop / Manual Table View */}
            <div className={`${viewMode === 'card' ? 'hidden md:block' : 'block'} border border-blue-200 rounded-xl overflow-x-auto shadow-sm`}>
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-blue-600">
                  <tr className="border-b border-blue-700">
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500">Task Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500">Update Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-500">Remarks</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-50">Owner(s)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-50">Project</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-50">Client</th>
                    {isVendorTask ? (
                        <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-50">Vendor</th>
                    ) : (
                        <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest border-r border-blue-50">Assignee(s)</th>
                    )}
                    <th className="px-6 py-4 text-[10px] font-bold text-white uppercase tracking-widest">Minutes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {taskLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-xs text-black font-bold whitespace-nowrap border-r border-blue-50">{formatToIndianDate(log.taskDate)}</td>
                      <td className="px-6 py-4 text-xs text-black font-bold whitespace-nowrap border-r border-blue-50">{formatToIndianDate(log.updateDate)}</td>
                      <td className="px-6 py-4 text-xs border-r border-blue-50">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase whitespace-nowrap border border-blue-200">
                            {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-black max-w-[300px] font-medium border-r border-blue-50">"{log.remarks}"</td>
                      <td className="px-6 py-4 text-xs text-black font-bold uppercase border-r border-blue-50">{log.owner}</td>
                      <td className="px-6 py-4 text-xs text-black font-bold border-r border-blue-50 max-w-[150px] truncate" title={log.project.split(' (')[0]}>{log.project.split(' (')[0]}</td>
                      <td className="px-6 py-4 text-xs text-black font-bold border-r border-blue-50 max-w-[150px] truncate" title={log.clientName}>{log.clientName || '-'}</td>
                      {isVendorTask ? (
                          <td className="px-6 py-4 text-xs text-black font-bold uppercase border-r border-blue-50">{log.vendor || '-'}</td>
                      ) : (
                          <td className="px-6 py-4 text-xs text-black font-bold border-r border-blue-50">{log.assignees}</td>
                      )}
                      <td className="px-6 py-4 text-xs text-indigo-600 font-bold">{log.hours || 0}</td>
                    </tr>
                  ))}
                  {taskLogs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-black font-bold opacity-40 uppercase tracking-widest text-xs bg-gray-50/20">
                        No update history found for this task.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-blue-100 bg-blue-50/20 rounded-b-xl flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-8 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all uppercase shadow-lg shadow-blue-200">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};