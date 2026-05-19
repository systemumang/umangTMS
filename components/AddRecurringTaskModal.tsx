import React, { useState } from 'react';
import { X } from 'lucide-react';
import { User, Category, RecurringTask, Firm } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface AddRecurringTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<RecurringTask, 'id' | 'lastUpdatedOn' | 'lastUpdateRemarks'>) => void;
  users: User[];
  categories: Category[];
  firms: Firm[];
}

export const AddRecurringTaskModal: React.FC<AddRecurringTaskModalProps> = ({ isOpen, onClose, onSave, users, categories, firms }) => {
			  const [formData, setFormData] = useState<{
			    title: string;
			    goal: number | '';
          firm: string;
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
			    goal: '',
          firm: '',
			    category: '',
		    assignee: '',
		    frequencyDays: '',
		    startDate: new Date().toISOString().split('T')[0],
		    time: '',
		    periodicity: 'Fixed Days',
		    recurrenceDay: 1,
		    recurrenceMonth: 'January'
		  });

  if (!isOpen) return null;

  const userOptions = users.map(u => ({ value: u.name, label: u.name }));
  const categoryOptions = categories.map(c => ({ value: c.name, label: c.name }));
  const firmOptions = firms.map(f => ({
    value: f.name,
    label: (f.sortName && String(f.sortName).trim()) ? String(f.sortName).trim() : f.name
  }));
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate frequencyDays only for Fixed Days periodicity
    if (formData.periodicity === 'Fixed Days' && (formData.frequencyDays === '' || Number(formData.frequencyDays) <= 0)) {
      return;
    }

    // Prepare task data based on periodicity
			    const taskData: any = {
			      title: formData.title,
			      goal: formData.goal,
            firm: formData.firm,
		      category: formData.category,
		      assignee: formData.assignee,
		      startDate: formData.startDate,
		      time: formData.time,
		      periodicity: formData.periodicity,
		      recurrenceDay: formData.recurrenceDay,
		      // Only include frequencyDays for Fixed Days periodicity
		      frequencyDays: formData.periodicity === 'Fixed Days' ? Number(formData.frequencyDays) : 0
		    };

    // Only include recurrenceMonth for Yearly periodicity
    if (formData.periodicity === 'Yearly') {
      taskData.recurrenceMonth = formData.recurrenceMonth;
    }

    onSave(taskData);

    // Reset form
			    setFormData({
			      title: '',
			      goal: '',
            firm: '',
		      category: '',
		      assignee: '',
		      frequencyDays: '',
		      startDate: new Date().toISOString().split('T')[0],
		      time: '',
		      periodicity: 'Fixed Days',
		      recurrenceDay: 1,
		      recurrenceMonth: 'January'
		    });
		    onClose();
		  };

	  const isFormValid = () => {
	    // Basic required fields validation
			    if (!formData.title.trim() || !formData.firm || !formData.category || !formData.assignee || !formData.startDate || !formData.time) {
		      return false;
		    }
    
    // Periodicity-specific validation
    switch (formData.periodicity) {
      case 'Fixed Days':
        return formData.frequencyDays !== '' && Number(formData.frequencyDays) > 0;
      case 'Weekly':
        return formData.recurrenceDay >= 0 && formData.recurrenceDay <= 6;
      case 'Monthly':
        return formData.recurrenceDay >= 1 && formData.recurrenceDay <= 31;
      case 'Yearly':
        return formData.recurrenceDay >= 1 && formData.recurrenceDay <= 31 && 
               months.includes(formData.recurrenceMonth);
      default:
        return false;
    }
  };

  const handlePeriodicityChange = (value: string) => {
    const newPeriodicity = value as 'Fixed Days' | 'Weekly' | 'Monthly' | 'Yearly';
    
    // Reset form fields based on the new periodicity
    setFormData(prev => {
      const newState = {
        ...prev,
        periodicity: newPeriodicity,
        frequencyDays: newPeriodicity === 'Fixed Days' ? prev.frequencyDays : '',
        // Reset recurrenceDay to appropriate default for each periodicity
        recurrenceDay: newPeriodicity === 'Weekly' ? 0 : 1
      };

      // Reset recurrenceMonth if changing from Yearly to another periodicity
      if (prev.periodicity === 'Yearly' && newPeriodicity !== 'Yearly') {
        newState.recurrenceMonth = 'January';
      }

      return newState;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600">New Recurring Task</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
	            <div className="space-y-1">
	              <label className="text-sm font-medium text-black">Task Title</label>
	              <input 
	                type="text"
	                required
		                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none appearance-none [-webkit-appearance:none] [-moz-appearance:textfield] [background-image:none] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0"
	                value={formData.title}
	                onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
	                placeholder="Enter task title"
	              />
	            </div>
		            <div className="space-y-1">
		              <label className="text-sm font-medium text-black">Goal</label>
		              <input
		                type="number"
                    min="0"
                    step="1"
		                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
		                value={formData.goal}
		                onChange={(e) => setFormData(p => ({ ...p, goal: e.target.value === '' ? '' : Number(e.target.value) }))}
			                placeholder="Enter numeric goal"
		              />
		            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-black uppercase tracking-wider block mb-1">Firm <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {firmOptions.map((firmOption) => (
                  <button
                    key={firmOption.value}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, firm: firmOption.value }))}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                      formData.firm === firmOption.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    {firmOption.label}
                  </button>
                ))}
              </div>
            </div>
	            <div className="grid grid-cols-2 gap-4">
	              <SearchableSelect 
	                label="Category"
	                options={categoryOptions}
	                value={formData.category}
                onChange={(val) => setFormData(p => ({ ...p, category: val }))}
                required
                placeholder="Select category"
              />
              <SearchableSelect 
                label="Assignee"
                options={userOptions}
                value={formData.assignee}
                onChange={(val) => setFormData(p => ({ ...p, assignee: val }))}
                required
                placeholder="Select assignee"
              />
            </div>

            {formData.periodicity === 'Fixed Days' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-black">Periodicity</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                    value={formData.periodicity}
                    onChange={(e) => handlePeriodicityChange(e.target.value)}
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
                    onChange={(e) => setFormData(p => ({ 
                      ...p, 
                      frequencyDays: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1)
                    }))}
                    placeholder="Enter number of days"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-sm font-medium text-black">Periodicity</label>
                <select 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                  value={formData.periodicity}
                  onChange={(e) => handlePeriodicityChange(e.target.value)}
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
                  onChange={(e) => setFormData(p => ({ 
                    ...p, 
                    recurrenceDay: parseInt(e.target.value) 
                  }))}
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
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setFormData(p => ({ 
                      ...p, 
                      recurrenceDay: Math.min(31, Math.max(1, value))
                    }));
                  }}
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
                    onChange={(e) => setFormData(p => ({ 
                      ...p, 
                      recurrenceMonth: e.target.value 
                    }))}
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
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setFormData(p => ({ 
                        ...p, 
                        recurrenceDay: Math.min(31, Math.max(1, value))
                      }));
                    }}
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
	            <button 
	              type="button" 
	              onClick={onClose} 
              className="px-6 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={!isFormValid()}
              className={`px-6 py-2.5 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                isFormValid() 
                  ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
