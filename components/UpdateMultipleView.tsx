
import React, { useState, useMemo } from 'react';
import { Project, Task } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

interface UpdateRow {
  id: string;
  projectId: string;
  taskId: number | null;
  remarks: string;
  minutes: number;
}

interface UpdateMultipleViewProps {
  projects: Project[];
  tasks: Task[];
  onUpdateTasks: (updates: Task[]) => Promise<void>;
}

export const UpdateMultipleView: React.FC<UpdateMultipleViewProps> = ({ projects, tasks, onUpdateTasks }) => {
  // Requirement: Show only one row when open
  const [rows, setRows] = useState<UpdateRow[]>([
    { id: Math.random().toString(), projectId: '', taskId: null, remarks: '', minutes: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const projectOptions = useMemo(() => {
    const uniqueProjectNames = Array.from(new Set(tasks.map(t => t.project)));
    return uniqueProjectNames.map(name => ({ 
      value: name, 
      label: name 
    }));
  }, [tasks]);

  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(), projectId: '', taskId: null, remarks: '', minutes: 0 }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    } else {
      setRows([{ id: Math.random().toString(), projectId: '', taskId: null, remarks: '', minutes: 0 }]);
    }
  };

  const updateRowField = (id: string, field: keyof UpdateRow, value: any) => {
    setRows(rows.map(r => {
      if (r.id === id) {
        if (field === 'projectId' && value !== r.projectId) {
          return { ...r, [field]: value, taskId: null };
        }
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const getTasksForProject = (projectName: string) => {
    return tasks
      .filter(t => t.project === projectName)
      .map(t => ({ value: t.id.toString(), label: t.title }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validUpdates = rows.filter(r => r.taskId && r.remarks.trim() !== '');
    if (validUpdates.length === 0) return;

    setIsSubmitting(true);
    try {
      const taskUpdates = validUpdates.map(r => {
        const originalTask = tasks.find(t => t.id === r.taskId);
        return {
          ...originalTask!,
          status: 'In Progress' as const,
          lastUpdateRemarks: r.remarks,
          hours: r.minutes
        };
      });
      await onUpdateTasks(taskUpdates);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setRows([
        { id: Math.random().toString(), projectId: '', taskId: null, remarks: '', minutes: 0 },
      ]);
    } catch (err) {
      console.error("Bulk update failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Requirement: Blue header white text, uppercase labels
  const thClass = "px-6 py-4 text-xs font-black text-white uppercase tracking-widest border-r border-indigo-500 last:border-r-0 text-left";
  // Requirement: Show dropdown outside (prevent clipping)
  const tdClass = "px-4 py-4 border-r border-indigo-50 last:border-r-0 align-top relative";

  return (
    <div className="max-w-7xl mx-auto space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-0">
      <div className="bg-[#4f46e5] text-white p-5 rounded-t-2xl shadow-xl border-b-2 border-indigo-700">
        <h2 className="text-2xl font-black text-center uppercase tracking-[0.2em]">Update Multiple Tasks</h2>
      </div>

      <div className="bg-white rounded-b-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-indigo-100 flex flex-col min-h-[500px]">
        {/* Requirement: Dropdown show outside - removed overflow-hidden or x-auto from this level */}
        <div className="overflow-visible">
          <table className="w-full border-separate border-spacing-0">
            <thead className="bg-indigo-600 sticky top-0 z-20">
              <tr>
                <th className={thClass} style={{ width: '25%' }}>PROJECT</th>
                <th className={thClass} style={{ width: '25%' }}>TASK</th>
                <th className={thClass} style={{ width: '35%' }}>REMARKS</th>
                <th className={thClass} style={{ width: '10%' }}>LOGGED</th>
                <th className="px-6 py-4 bg-indigo-600" style={{ width: '5%' }}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-indigo-50/10 transition-colors group">
                  <td className={tdClass}>
                    <SearchableSelect
                      options={projectOptions}
                      value={row.projectId}
                      onChange={(val) => updateRowField(row.id, 'projectId', val)}
                      placeholder="Select Project..."
                      className="!min-h-0"
                    />
                  </td>
                  <td className={tdClass}>
                    <SearchableSelect
                      options={row.projectId ? getTasksForProject(row.projectId) : []}
                      value={row.taskId?.toString() || ''}
                      onChange={(val) => updateRowField(row.id, 'taskId', parseInt(val))}
                      placeholder={row.projectId ? "Select Task..." : "Select Project First"}
                      className="!min-h-0"
                      disabled={!row.projectId}
                    />
                  </td>
                  <td className={tdClass}>
                    <textarea
                      value={row.remarks}
                      onChange={(e) => updateRowField(row.id, 'remarks', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm min-h-[50px] resize-none transition-all placeholder:text-gray-300"
                      placeholder="Enter activity remarks"
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      value={row.minutes}
                      onChange={(e) => updateRowField(row.id, 'minutes', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm font-bold text-indigo-700 text-center transition-all"
                      min="0"
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all group-hover:text-gray-400"
                      title="Remove row"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-8 bg-white flex flex-col gap-10 mt-auto">
          <div className="w-full flex justify-end">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-indigo-500 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all font-black text-sm shadow-sm active:scale-95"
            >
              <Plus size={20} />
              ADD ROW
            </button>
          </div>

          <div className="flex flex-col items-center gap-6">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || rows.every(r => !r.taskId)}
              className={`
                relative flex items-center justify-center gap-4 px-32 py-5 rounded-2xl font-black text-xl uppercase tracking-[0.2em] transition-all
                ${isSubmitting 
                  ? 'bg-indigo-400 text-white cursor-wait' 
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98] shadow-[0_15px_30px_-10px_rgba(79,70,229,0.5)]'
                }
                ${rows.every(r => !r.taskId) ? 'opacity-50 grayscale cursor-not-allowed shadow-none' : ''}
              `}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={28} />
              ) : success ? (
                <CheckCircle2 size={28} />
              ) : null}
              <span>{isSubmitting ? 'UPDATING...' : success ? 'SUBMITTED!' : 'SUBMIT UPDATES'}</span>
            </button>
            
            {success && (
              <p className="text-green-600 font-black text-sm animate-bounce tracking-widest uppercase">
                All selected tasks updated successfully!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Requirement: Blue footer bar with BizSkill logo centered */}
      <div className="bg-[#1e3a8a] w-full py-10 mt-12 flex flex-col items-center justify-center space-y-3">
          <div className="bg-white p-0 rounded shadow-md overflow-hidden">
             <div className="bg-black px-4 py-1 text-white text-xs font-black tracking-widest text-center border-b border-white/20">BIZ</div>
             <div className="bg-white px-4 py-1 text-black text-sm font-black tracking-[0.3em] text-center">SKILL</div>
          </div>
          <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.5em]">Powered by BizSkill</span>
      </div>
    </div>
  );
};
