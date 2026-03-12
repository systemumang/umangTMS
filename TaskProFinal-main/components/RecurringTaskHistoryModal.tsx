
import React from 'react';
import { X, Download, Clock, Calendar, AlertCircle } from 'lucide-react';
import { RecurringTask, RecurringTaskAction } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RecurringTaskHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: RecurringTask | null;
  actions: RecurringTaskAction[];
}

export const RecurringTaskHistoryModal: React.FC<RecurringTaskHistoryModalProps> = ({ isOpen, onClose, task, actions }) => {
  if (!isOpen || !task) return null;

  // Use numeric comparison for safety
  const taskActions = actions.filter(a => Number(a.taskId) === Number(task.id));

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const s = String(dateStr).trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) return s;
    const parts = s.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return s;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Recurring Task History', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Task: ${task.title}`, 14, 28);
    doc.text(`Assignee: ${task.assignee}`, 14, 34);

    const tableColumn = ["Date", "Time", "Status", "Remarks"];
    const tableRows = taskActions.map(a => [
      formatDate(a.updatedOn),
      a.timestamp,
      a.status,
      a.remarks
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 }
    });

    doc.save(`History_${task.id}_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-indigo-600">Update History</h2>
            <p className="text-sm text-gray-500 mt-1">{task.title} • {task.assignee}</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
              >
                <Download size={16} />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Desktop Table View */}
          <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {taskActions.map((action) => (
                  <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-black font-medium">{formatDate(action.updatedOn)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 italic">{action.timestamp}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(action.status)}`}>
                        {action.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-black">{action.remarks}</td>
                  </tr>
                ))}
                {taskActions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      No update history recorded for this task.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
             {taskActions.map((action) => (
                <div key={action.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                   <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(action.status)}`}>{action.status}</span>
                      <div className="text-right">
                         <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1 justify-end"><Calendar size={12} />{formatDate(action.updatedOn)}</div>
                         <div className="text-[9px] text-gray-400 font-medium mt-0.5 italic">{action.timestamp}</div>
                      </div>
                   </div>
                   <div className="bg-indigo-50/50 border border-indigo-100 p-2 rounded">
                      <p className="text-xs text-gray-700 leading-relaxed">"{action.remarks || 'No remarks provided'}"</p>
                   </div>
                </div>
             ))}
             {taskActions.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm italic">
                   No recurring history logs available.
                </div>
             )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
