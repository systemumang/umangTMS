
import React, { useState, useMemo } from 'react';
import { Project, Task } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

interface UpdateRow {
  id: string;
  projectId: string;
  taskId: number | null;
  remarks: string;
  minutes: number | '';
}

interface UpdateMultipleViewProps {
  projects: Project[];
  tasks: Task[];
  onUpdateTasks: (updates: Task[]) => Promise<void>;
}

export const UpdateMultipleView: React.FC<UpdateMultipleViewProps> = ({ projects, tasks, onUpdateTasks }) => {
  const [rows, setRows] = useState<UpdateRow[]>([
    { id: Math.random().toString(), projectId: '', taskId: null, remarks: '', minutes: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const projectOptions = useMemo(() => {
    const uniqueProjectNames = Array.from(new Set(tasks.map(t => t.project)));
    return uniqueProjectNames.map(name => ({ 
      value: name, 
      label: name 
    }));
  }, [tasks]);

  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(), projectId: '', taskId: null, remarks: '', minutes: '' }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    } else {
      setRows([{ id: Math.random().toString(), projectId: '', taskId: null, remarks: '', minutes: '' }]);
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
    const validUpdates = rows.filter(r => Number.isFinite(r.taskId) && r.taskId !== null && r.remarks.trim() !== '');
    if (validUpdates.length === 0) return;

    setIsSubmitting(true);
    try {
      const taskUpdates = validUpdates
        .map(r => {
          const originalTask = tasks.find(t => t.id === r.taskId);
          if (!originalTask) return null;
          return {
            ...originalTask,
            status: 'In Progress' as const,
            lastUpdateRemarks: r.remarks,
            hours: Number(r.minutes || 0)
          };
        })
        .filter((item): item is Task => item !== null);

      if (taskUpdates.length === 0) return;
      await onUpdateTasks(taskUpdates);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setRows([
        { id: Math.random().toString(), projectId: '', taskId: null, remarks: '', minutes: '' },
      ]);
    } catch (err) {
      console.error("Bulk update failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const thClass = "px-3 py-2.5 text-[11px] font-black text-white uppercase tracking-widest border-r border-black last:border-r-0 text-left";
  const tdClass = "px-2 py-1.5 border-r border-b border-black last:border-r-0 align-top relative";

  return (
    <div className="max-w-7xl mx-auto space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-0 overflow-visible">
      <div className="bg-[#4f46e5] text-white px-4 py-3 rounded-t-2xl shadow-xl border-b-2 border-black flex items-center justify-between gap-4">
        <h2 className="text-xl font-black uppercase tracking-[0.2em]">Update Multiple Tasks</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-all shadow-[0_8px_16px_-10px_rgba(79,70,229,0.8)]"
            title="Add row"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || rows.every(r => !r.taskId)}
            className={`
              relative flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-[0.16em] transition-all whitespace-nowrap
              ${isSubmitting 
                ? 'bg-black text-white cursor-wait' 
                : 'bg-black text-white hover:bg-black/90 active:scale-[0.98] shadow-[0_10px_20px_-8px_rgba(0,0,0,0.35)]'
              }
              ${rows.every(r => !r.taskId) ? 'opacity-60 cursor-not-allowed shadow-none' : ''}
            `}
          >
            {isSubmitting ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : success ? (
                  <CheckCircle2 size={14} />
                ) : null}
            <span>{isSubmitting ? 'Updating...' : success ? 'Submitted!' : 'Submit Updates'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-b-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-black flex flex-col min-h-[320px] overflow-visible">
        <div className="overflow-visible border-b border-black">
          <table className="w-full border-separate border-spacing-0 table-fixed overflow-visible">
            <thead className="bg-indigo-600 sticky top-0 z-20">
              <tr>
                <th className={thClass} style={{ width: '24%' }}>PROJECT</th>
                <th className={thClass} style={{ width: '24%' }}>TASK</th>
                <th className={thClass} style={{ width: '35%' }}>REMARKS</th>
                <th className={thClass} style={{ width: '11%' }}>LOGGED</th>
                <th className="px-3 py-2.5 bg-indigo-600 border-l border-black" style={{ width: '6%' }}></th>
              </tr>
            </thead>
            <tbody className="overflow-visible">
              {rows.map((row) => (
                <tr 
                  key={row.id} 
                  className={`hover:bg-indigo-50/10 transition-colors group relative ${activeRowId === row.id ? 'z-50' : 'z-10'}`}
                  onFocusCapture={() => setActiveRowId(row.id)}
                >
                  <td className={tdClass}>
                    <SearchableSelect
                      options={projectOptions}
                      value={row.projectId}
                      onChange={(val) => updateRowField(row.id, 'projectId', val)}
                      placeholder="Select Project..."
                      className="!min-h-0"
                      compact
                    />
                  </td>
                  <td className={tdClass}>
                    <SearchableSelect
                      options={row.projectId ? getTasksForProject(row.projectId) : []}
                      value={row.taskId?.toString() || ''}
                      onChange={(val) => {
                        const parsed = Number(val);
                        updateRowField(row.id, 'taskId', Number.isFinite(parsed) ? parsed : null);
                      }}
                      placeholder={row.projectId ? "Select Task..." : "Select Project First"}
                      className="!min-h-0"
                      compact
                      disabled={!row.projectId}
                    />
                  </td>
                  <td className={tdClass}>
                    <textarea
                      value={row.remarks}
                      onChange={(e) => updateRowField(row.id, 'remarks', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-black rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm text-black min-h-[34px] resize-none transition-all placeholder:text-black"
                      placeholder="Enter activity remarks"
                    />
                  </td>
                  <td className={tdClass}>
                    <input
                      type="number"
                      value={row.minutes}
                      onChange={(e) => updateRowField(row.id, 'minutes', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-white border border-black rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-sm font-bold text-black text-center transition-all"
                      min="0"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center border-l border-b border-black">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="p-2 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all"
                      title="Remove row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

