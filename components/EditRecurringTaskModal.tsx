
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { User, Category, RecurringTask } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface EditRecurringTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: RecurringTask) => void;
  task: RecurringTask | null;
  users: User[];
  categories: Category[];
}

export const EditRecurringTaskModal: React.FC<EditRecurringTaskModalProps> = ({ isOpen, onClose, onSave, task, users, categories }) => {
  // Fix: Explicitly define periodicity type to avoid 'Fixed Days' narrowing
	  const [formData, setFormData] = useState<{
	    title: string;
	    category: string;
	    assignee: string;
	    frequencyDays: number | '';
	    startDate: string;
	    time: string;
	    periodicity: 'Fixed Days' | 'Weekly' | 'Monthly' | 'Yearly';
	    recurrenceDay: number;
	    recurrenceMonth: string;
	  }>({
	    title: '',
	    category: '',
	    assignee: '',
	    frequencyDays: '',
	    startDate: '',
	    time: '',
	    periodicity: 'Fixed Days',
	    recurrenceDay: 1,
	    recurrenceMonth: 'January'
	  });

  useEffect(() => {
	    if (task) {
	      setFormData({
	        title: task.title,
	        category: task.category,
	        assignee: task.assignee,
	        frequencyDays: task.frequencyDays,
	        startDate: task.startDate,
	        time: task.time || '',
	        periodicity: task.periodicity || 'Fixed Days',
	        recurrenceDay: task.recurrenceDay ?? 1,
	        recurrenceMonth: task.recurrenceMonth || 'January'
	      });
	    }
	  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const userOptions = users.map(u => ({ value: u.name, label: u.name }));
  const categoryOptions = categories.map(c => ({ value: c.name, label: c.name }));
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.frequencyDays === '') return;

    onSave({
      ...task,
      ...formData,
      frequencyDays: Number(formData.frequencyDays)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600">Edit Recurring Task</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <label className="text-sm font-medium text-black">Task Title *</label>
              <input 
                type="text"
                required
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                value={formData.title}
                onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect 
                label="Category"
                options={categoryOptions}
                value={formData.category}
                onChange={(val) => setFormData(p => ({ ...p, category: val }))}
                required
              />
              <SearchableSelect 
                label="Assignee"
                options={userOptions}
                value={formData.assignee}
                onChange={(val) => setFormData(p => ({ ...p, assignee: val }))}
                required
              />
            </div>

            {formData.periodicity === 'Fixed Days' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-black">Periodicity</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={formData.periodicity}
                    onChange={(e) => setFormData(p => ({ ...p, periodicity: e.target.value as any }))}
                  >
                    <option value="Fixed Days">Fixed Interval (Days)</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-black">Frequency (Days) *</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={formData.frequencyDays}
                    onChange={(e) => setFormData(p => ({ ...p, frequencyDays: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium text-black">Periodicity</label>
                <select 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                  value={formData.periodicity}
                  onChange={(e) => setFormData(p => ({ ...p, periodicity: e.target.value as any }))}
                >
                  <option value="Fixed Days">Fixed Interval (Days)</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            )}

            {formData.periodicity === 'Weekly' && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-black">Day of Week *</label>
                <select 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                  value={formData.recurrenceDay}
                  onChange={(e) => setFormData(p => ({ ...p, recurrenceDay: parseInt(e.target.value) }))}
                >
                  {weekDays.map((day, idx) => (
                    <option key={day} value={idx}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.periodicity === 'Monthly' && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-black">Day of Month (1-31) *</label>
                <input 
                  type="number"
                  required
                  min="1"
                  max="31"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                  value={formData.recurrenceDay}
                  onChange={(e) => setFormData(p => ({ ...p, recurrenceDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) }))}
                />
              </div>
            )}

            {formData.periodicity === 'Yearly' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-black">Month *</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={formData.recurrenceMonth}
                    onChange={(e) => setFormData(p => ({ ...p, recurrenceMonth: e.target.value }))}
                  >
                    {months.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-black">Day (1-31) *</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    max="31"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={formData.recurrenceDay}
                    onChange={(e) => setFormData(p => ({ ...p, recurrenceDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  />
                </div>
              </div>
            )}

	            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
	              <div className="space-y-1">
	                <label className="text-sm font-medium text-black">Start Date *</label>
	                <input 
	                  type="date"
	                  required
	                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
	                  value={formData.startDate}
	                  onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))}
	                />
	              </div>

	              <div className="space-y-1">
	                <label className="text-sm font-medium text-black">Time *</label>
	                <input
	                  type="time"
	                  required
	                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
	                  value={formData.time}
	                  onChange={(e) => setFormData(p => ({ ...p, time: e.target.value }))}
	                />
	              </div>
	            </div>
	          </div>
	          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
	            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">Cancel</button>
	            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">Save Changes</button>
	          </div>
        </form>
      </div>
    </div>
  );
};
