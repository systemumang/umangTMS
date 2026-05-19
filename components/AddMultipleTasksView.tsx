
import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { Project, Task, User, Category } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface AddRow {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  project: string;
  assignees: string[];
  owner: string;
  category: string;
  dueDate: string;
  notes: string;
}

interface AddMultipleTasksViewProps {
  projects: Project[];
  users: User[];
  categories: Category[];
  onSaveTasks: (tasks: any[]) => Promise<void>;
  currentUser?: User | null;
  onOpenAddProject?: (initialName: string) => void;
  onOpenAddCategory?: (initialName: string) => void;
}

export const AddMultipleTasksView: React.FC<AddMultipleTasksViewProps> = ({ 
  projects, 
  users, 
  categories, 
  onSaveTasks,
  currentUser,
  onOpenAddProject,
  onOpenAddCategory
}) => {
  const [rows, setRows] = useState<AddRow[]>([
    { id: '1', title: '', priority: 'Medium', project: '', assignees: [], owner: currentUser?.name || 'PANKAJ KUMAR JAIN', category: '', dueDate: '', notes: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    task: 180,
    priority: 90,
    project: 140,
    assignee: 160,
    owner: 140,
    category: 130,
    dueDate: 120,
    notes: 130
  });

  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const startResize = (column: string, e: React.MouseEvent) => {
    resizingColumn.current = column;
    startX.current = e.pageX;
    startWidth.current = columnWidths[column];
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (resizingColumn.current) {
      const diff = e.pageX - startX.current;
      const newWidth = Math.max(50, startWidth.current + diff);
      setColumnWidths(prev => ({ ...prev, [resizingColumn.current!]: newWidth }));
    }
  };

  const stopResize = () => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
  };

  const activeUsers = useMemo(() => users.filter(u => u.isActive), [users]);
  const userOptions = useMemo(() => activeUsers.map(u => ({ value: u.name, label: u.name })), [activeUsers]);
  const categoryOptions = useMemo(() => categories.map(c => ({ value: c.name, label: c.name })), [categories]);
  const projectOptions = useMemo(() => projects.map(p => {
    const val = `${p.name.trim()} (${p.client.trim()})`;
    return { value: val, label: val };
  }), [projects]);

  const addRow = () => {
    const newRow: AddRow = { 
      id: Math.random().toString(36).substr(2, 9), 
      title: '', 
      priority: 'Medium', 
      project: '', 
      assignees: [], 
      owner: currentUser?.name || 'PANKAJ KUMAR JAIN', 
      category: '', 
      dueDate: '', 
      notes: '' 
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const updateField = (id: string, field: keyof AddRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const isRowComplete = (r: AddRow) => {
    return r.title.trim() !== '' && 
           r.assignees.length > 0 && 
           r.owner !== '' && 
           r.category !== '' && 
           r.dueDate !== '';
  };

  const handleSubmit = async () => {
    const validTasks = rows.filter(isRowComplete);
    if (validTasks.length === 0) return;

    setIsSubmitting(true);
    try {
      const payload = validTasks.map(r => ({
        title: r.title,
        priority: r.priority,
        project: r.project,
        assignees: r.assignees.join(', '),
        owner: r.owner,
        category: r.category,
        dueDate: r.dueDate,
        remarks: r.notes,
        hours: 0
      }));

      await onSaveTasks(payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setRows([
        { id: '1', title: '', priority: 'Medium', project: '', assignees: [], owner: currentUser?.name || 'PANKAJ KUMAR JAIN', category: '', dueDate: '', notes: '' }
      ]);
    } catch (err) {
      console.error("Bulk submission failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const thClass = "px-4 py-3 text-xs font-black text-white uppercase tracking-widest border-r border-black last:border-r-0 text-left bg-blue-600 sticky top-0 z-20 relative";
  const tdClass = "px-2 py-3 border-r border-b border-black last:border-r-0 align-top relative";

  const ResizeHandle = ({ col }: { col: string }) => (
    <div 
      onMouseDown={(e) => startResize(col, e)}
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30 transition-colors z-30"
    />
  );

  return (
    <div className="space-y-0 animate-in fade-in duration-500 max-w-full mx-auto">
      <div className="bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-blue-100 flex flex-col min-h-[400px] overflow-visible">
        <div className="hidden md:block">
          {/* Scrollable Container - Tight against content to keep scrollbar just below last row */}
          <div className="overflow-visible border-b border-black">
            <table className="w-full border-separate border-spacing-0 table-fixed overflow-visible">
              <thead className="bg-blue-600 sticky top-0 z-20">
                <tr>
                  <th className={thClass} style={{ width: columnWidths.task }}>TASK <ResizeHandle col="task" /></th>
                  <th className={thClass} style={{ width: columnWidths.priority }}>PRIORITY <ResizeHandle col="priority" /></th>
                  <th className={thClass} style={{ width: columnWidths.assignee }}>ASSIGNEE <ResizeHandle col="assignee" /></th>
                  <th className={thClass} style={{ width: columnWidths.owner }}>TASK OWNER <ResizeHandle col="owner" /></th>
                  <th className={thClass} style={{ width: columnWidths.category }}>CATEGORY <ResizeHandle col="category" /></th>
                  <th className={thClass} style={{ width: columnWidths.dueDate }}>DUE DATE <ResizeHandle col="dueDate" /></th>
                  <th className={thClass} style={{ width: columnWidths.notes }}>NOTES <ResizeHandle col="notes" /></th>
                  <th className="px-4 py-3 bg-blue-600 w-[80px] text-center">
                    <button
                      onClick={addRow}
                      className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-colors border border-white/30"
                      title="Add new row"
                    >
                      <Plus size={18} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="overflow-visible">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-blue-50/10 transition-colors group relative ${activeRowId === row.id ? 'z-50' : 'z-10'}`}
                    onFocusCapture={() => setActiveRowId(row.id)}
                  >
                    <td className={tdClass}>
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => updateField(row.id, 'title', e.target.value)}
                        placeholder="Task title..."
                        className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-xs font-medium text-black placeholder-black"
                      />
                    </td>
                    <td className={tdClass}>
                      <select
                        value={row.priority}
                        onChange={(e) => updateField(row.id, 'priority', e.target.value)}
                        className="w-full px-1 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-[10px] font-bold text-black"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </td>
                    <td className={tdClass}>
                      <SearchableSelect
                        multiple
                        options={userOptions}
                        value={row.assignees}
                        onChange={(val) => updateField(row.id, 'assignees', val)}
                        placeholder="Assignees..."
                        className="!min-h-0 text-[10px]"
                      />
                    </td>
                    <td className={tdClass}>
                      <SearchableSelect
                        options={userOptions}
                        value={row.owner}
                        onChange={(val) => updateField(row.id, 'owner', val)}
                        placeholder="Owner..."
                        className="!min-h-0 text-[10px]"
                      />
                    </td>
	                    <td className={tdClass}>
	                      <SearchableSelect
	                        options={categoryOptions}
	                        value={row.category}
	                        onChange={(val) => updateField(row.id, 'category', val)}
	                        placeholder="Category..."
	                        className="!min-h-0 text-[10px]"
	                        allowCreate
	                        onCreateOption={(v) => {
	                          onOpenAddCategory?.(v);
	                          return false;
	                        }}
	                        createLabel={(v) => `Add Category "${v}"`}
	                      />
	                    </td>
                    <td className={tdClass}>
                      <input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) => updateField(row.id, 'dueDate', e.target.value)}
                        className="w-full px-1 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-[10px] text-center font-bold text-black"
                      />
                    </td>
                    <td className={tdClass}>
                      <textarea
                        value={row.notes}
                        onChange={(e) => updateField(row.id, 'notes', e.target.value)}
                        rows={1}
                        placeholder="Notes..."
                        className="w-full px-2 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-xs resize-none text-black placeholder-black"
                      />
                    </td>
                    <td className="px-2 py-3 text-center w-[80px] border-b border-black">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-full transition-all"
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

        <div className="md:hidden p-3 space-y-3 border-b border-blue-100 bg-blue-50/30">
          {rows.map((row, idx) => (
            <div key={row.id} className="bg-white border border-blue-200 rounded-xl shadow-sm p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Task Row {idx + 1}</span>
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className={`p-1.5 rounded-full transition-all ${rows.length === 1 ? 'text-white bg-red-300 cursor-not-allowed' : 'text-white bg-red-500 hover:bg-red-600'}`}
                  title="Remove row"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1 block">Task</label>
                  <input
                    type="text"
                    value={row.title}
                    onChange={(e) => updateField(row.id, 'title', e.target.value)}
                    placeholder="Task title..."
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm text-black placeholder-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1 block">Priority</label>
                    <select
                      value={row.priority}
                      onChange={(e) => updateField(row.id, 'priority', e.target.value)}
                      className="w-full px-2 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-xs font-bold text-black"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1 block">Due Date</label>
                    <input
                      type="date"
                      value={row.dueDate}
                      onChange={(e) => updateField(row.id, 'dueDate', e.target.value)}
                      className="w-full px-2 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-xs font-bold text-black"
                    />
                  </div>
                </div>

                <SearchableSelect
                  label="Assignee"
                  multiple
                  options={userOptions}
                  value={row.assignees}
                  onChange={(val) => updateField(row.id, 'assignees', val)}
                  placeholder="Assignees..."
                  className="text-sm"
                />

                <SearchableSelect
                  label="Task Owner"
                  options={userOptions}
                  value={row.owner}
                  onChange={(val) => updateField(row.id, 'owner', val)}
                  placeholder="Owner..."
                  className="text-sm"
                />

                <SearchableSelect
                  label="Category"
                  options={categoryOptions}
                  value={row.category}
                  onChange={(val) => updateField(row.id, 'category', val)}
                  placeholder="Category..."
                  className="text-sm"
                />

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1 block">Notes</label>
                  <textarea
                    value={row.notes}
                    onChange={(e) => updateField(row.id, 'notes', e.target.value)}
                    rows={2}
                    placeholder="Notes..."
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm resize-none text-black placeholder-black"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addRow}
            className="w-full py-2.5 px-4 rounded-xl border border-blue-300 bg-white text-blue-700 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add Another Row
          </button>
        </div>

        <div className="p-4 sm:p-6 md:p-8 bg-white flex flex-col items-center gap-4 md:gap-6 mt-auto">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !rows.some(isRowComplete)}
            className={`
              relative w-full md:w-auto flex items-center justify-center gap-4 px-6 md:px-32 py-4 md:py-5 rounded-2xl font-black text-sm md:text-xl uppercase tracking-[0.15em] md:tracking-[0.2em] transition-all shadow-xl
              ${isSubmitting 
                ? 'bg-black text-white cursor-wait' 
                : 'bg-black text-white hover:bg-black/90 active:scale-[0.98] shadow-black/20'
              }
              ${!rows.some(isRowComplete) ? 'opacity-60 cursor-not-allowed shadow-none' : ''}
            `}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={28} />
            ) : success ? (
              <CheckCircle2 size={28} />
            ) : null}
            <span>{isSubmitting ? 'SUBMITTING...' : success ? 'SUBMITTED!' : 'SUBMIT'}</span>
          </button>
          
          {success && (
            <p className="text-green-600 font-black text-sm animate-bounce tracking-widest uppercase">
              Tasks added successfully!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


