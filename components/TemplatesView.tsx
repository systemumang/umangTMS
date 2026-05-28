
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Save, X, Layers, Copy, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Template, TemplateTask, Firm, Category } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface TemplatesViewProps {
  templates: Template[];
  templateTasks: TemplateTask[];
  firms: Firm[];
  categories: Category[];
  onAddTemplate: (t: Omit<Template, 'id'>) => Promise<any>;
  onUpdateTemplate: (t: Template) => Promise<any>;
  onDeleteTemplate: (id: number) => void;
  onAddTemplateTask: (t: Omit<TemplateTask, 'id'>) => Promise<any>;
  onUpdateTemplateTask: (t: TemplateTask) => Promise<any>;
  onDeleteTemplateTask: (id: number) => void;
  onBulkAddTasks: (templateId: number, tasks: any[]) => Promise<any>;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  templateTasks,
  firms,
  categories,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onAddTemplateTask,
  onUpdateTemplateTask,
  onDeleteTemplateTask,
  onBulkAddTasks
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState<number | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('');

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkData, setBulkData] = useState('');

  const selectedTemplate = useMemo(() => 
    templates.find(t => t.id === selectedTemplateId), 
    [templates, selectedTemplateId]
  );

  const filteredTasks = useMemo(() => 
    templateTasks.filter(t => t.templateId === selectedTemplateId),
    [templateTasks, selectedTemplateId]
  );

  const [taskForm, setTaskForm] = useState<Partial<TemplateTask>>({
    title: '',
    notes: '',
    firm: '',
    category: '',
    frequencyType: 'Monthly',
    frequencyDays: 30,
    recurrenceDay: 1,
    recurrenceMonth: '',
    time: '',
    goal: 0
  });

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    if (isEditingTemplate) {
      await onUpdateTemplate({ id: isEditingTemplate, name: newTemplateName, type: newTemplateType });
      setIsEditingTemplate(null);
    } else {
      await onAddTemplate({ name: newTemplateName, type: newTemplateType });
      setIsAddingTemplate(false);
    }
    setNewTemplateName('');
    setNewTemplateType('');
  };

  const handleSaveTask = async () => {
    if (!taskForm.title || !selectedTemplateId) return;
    const payload = { ...taskForm, templateId: selectedTemplateId } as TemplateTask;
    if (editingTaskId) {
      await onUpdateTemplateTask({ ...payload, id: editingTaskId });
      setEditingTaskId(null);
    } else {
      await onAddTemplateTask(payload);
      setIsAddingTask(false);
    }
    setTaskForm({
      title: '',
      notes: '',
      firm: '',
      category: '',
      frequencyType: 'Monthly',
      frequencyDays: 30,
      recurrenceDay: 1,
      recurrenceMonth: '',
      time: '',
      goal: 0
    });
  };

  const handleProcessBulk = async () => {
    if (!bulkData.trim() || !selectedTemplateId) return;
    const rows = bulkData.split('\n');
    const tasks = rows.map(row => {
      const cols = row.split('\t');
      if (cols.length < 1) return null;
      return {
        title: cols[0]?.trim(),
        firm: cols[1]?.trim() || '',
        category: cols[2]?.trim() || '',
        frequencyType: cols[3]?.trim() || 'Monthly',
        frequencyDays: parseInt(cols[4]) || 30,
        recurrenceDay: parseInt(cols[5]) || 1,
        goal: cols[6]?.trim() || ''
      };
    }).filter(t => t && t.title);

    await onBulkAddTasks(selectedTemplateId, tasks);
    setIsBulkUploading(false);
    setBulkData('');
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Layers className="text-indigo-600" />
            Task Templates
          </h2>
          <p className="text-sm text-gray-500">Manage blueprints for recurring task assignments</p>
        </div>
        <button
          onClick={() => { setIsAddingTemplate(true); setIsEditingTemplate(null); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus size={18} />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Templates List */}
        <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-semibold text-gray-700">Templates</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`p-4 cursor-pointer hover:bg-indigo-50 transition-colors group ${
                  selectedTemplateId === t.id ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${selectedTemplateId === t.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{t.type}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingTemplate(t.id);
                        setNewTemplateName(t.name);
                        setNewTemplateType(t.type);
                        setIsAddingTemplate(true);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTemplate(t.id);
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Template Tasks Table */}
        <div className="md:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[500px]">
          {selectedTemplate ? (
            <>
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedTemplate.name} Tasks</h3>
                  <p className="text-xs text-gray-500">{filteredTasks.length} blueprints defined</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsBulkUploading(true)}
                    className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 flex items-center gap-2 text-sm font-medium"
                  >
                    <Upload size={16} />
                    Bulk Upload
                  </button>
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium shadow-sm"
                  >
                    <Plus size={16} />
                    Add Task Blueprint
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Task Title</th>
                      <th className="px-4 py-3 font-semibold">Firm/Category</th>
                      <th className="px-4 py-3 font-semibold">Frequency</th>
                      <th className="px-4 py-3 font-semibold">Goal</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <Layers size={48} className="opacity-20" />
                            <p>No tasks defined for this template yet.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map(task => (
                        <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{task.title}</p>
                            {task.notes && <p className="text-xs text-gray-500 line-clamp-1">{task.notes}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-700">{task.firm}</span>
                              <span className="text-xs text-gray-500">{task.category}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-indigo-600">{task.frequencyType}</span>
                              <span className="text-xs text-gray-500">
                                {task.frequencyType === 'Monthly' ? `Day ${task.recurrenceDay}` : 
                                 task.frequencyType === 'Weekly' ? `Day ${task.frequencyDays}` :
                                 `${task.frequencyDays} days`}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{task.goal}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setTaskForm(task);
                                  setEditingTaskId(task.id);
                                  setIsAddingTask(true);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => onDeleteTemplateTask(task.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
              <Layers size={64} className="opacity-10" />
              <div className="text-center">
                <p className="text-lg font-medium">Select a template</p>
                <p className="text-sm">Choose a template from the left to view and manage its tasks.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Template Modal */}
      {isAddingTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <h3 className="text-xl font-bold">{isEditingTemplate ? 'Edit Template' : 'Create New Template'}</h3>
              <button onClick={() => setIsAddingTemplate(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="e.g. Accounting Monthly"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Type/Department</label>
                <input
                  type="text"
                  value={newTemplateType}
                  onChange={e => setNewTemplateType(e.target.value)}
                  placeholder="e.g. Finance"
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsAddingTemplate(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all"
                >
                  {isEditingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Task Blueprint Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <h3 className="text-xl font-bold">{editingTaskId ? 'Edit Task Blueprint' : 'Add Task Blueprint'}</h3>
              <button onClick={() => setIsAddingTask(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-semibold text-gray-700">Task Title</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Firm</label>
                <SearchableSelect
                  options={firms.map(f => f.name)}
                  value={taskForm.firm || ''}
                  onChange={val => setTaskForm({ ...taskForm, firm: val })}
                  placeholder="Select Firm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Category</label>
                <SearchableSelect
                  options={categories.map(c => c.name)}
                  value={taskForm.category || ''}
                  onChange={val => setTaskForm({ ...taskForm, category: val })}
                  placeholder="Select Category"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Frequency</label>
                <select
                  value={taskForm.frequencyType}
                  onChange={e => setTaskForm({ ...taskForm, frequencyType: e.target.value as any })}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Fixed Days">Fixed Days</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  {taskForm.frequencyType === 'Monthly' ? 'Day of Month' : 
                   taskForm.frequencyType === 'Weekly' ? 'Day of Week (1-7)' : 'Days'}
                </label>
                <input
                  type="number"
                  value={taskForm.frequencyType === 'Monthly' ? taskForm.recurrenceDay : taskForm.frequencyDays}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (taskForm.frequencyType === 'Monthly') setTaskForm({ ...taskForm, recurrenceDay: val });
                    else setTaskForm({ ...taskForm, frequencyDays: val });
                  }}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Goal (Numeric)</label>
                <input
                  type="number"
                  value={taskForm.goal}
                  onChange={e => setTaskForm({ ...taskForm, goal: parseInt(e.target.value) })}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">Time</label>
                <input
                  type="time"
                  value={taskForm.time}
                  onChange={e => setTaskForm({ ...taskForm, time: e.target.value })}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-semibold text-gray-700">Notes/Instructions</label>
                <textarea
                  value={taskForm.notes}
                  onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })}
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setIsAddingTask(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTask}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all"
              >
                {editingTaskId ? 'Update Blueprint' : 'Save Blueprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkUploading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <div>
                <h3 className="text-xl font-bold text-white">Bulk Upload Tasks</h3>
                <p className="text-indigo-100 text-xs mt-1">Paste data from Excel/Sheets (Title, Firm, Category, FreqType, Days, RecDay, Goal)</p>
              </div>
              <button onClick={() => setIsBulkUploading(false)} className="hover:bg-white/20 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={bulkData}
                onChange={e => setBulkData(e.target.value)}
                placeholder="Paste tab-separated rows here..."
                className="w-full h-[300px] p-4 border border-gray-200 rounded-xl font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 items-start">
                <AlertCircle className="text-blue-600 shrink-0" size={20} />
                <div className="text-xs text-blue-700">
                  <p className="font-bold mb-1">Format Guide:</p>
                  <p>Title [Tab] Firm [Tab] Category [Tab] FreqType (Monthly/Weekly/Fixed Days) [Tab] Days [Tab] RecDay [Tab] Goal</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setIsBulkUploading(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessBulk}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                Process & Save Tasks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
