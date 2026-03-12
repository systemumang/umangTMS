
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { RecurringTask } from '../types';

interface UpdateRecurringTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: RecurringTask | null;
  onSave: (updatedTask: RecurringTask & { lastUpdateRemarks: string }) => void;
}

export const UpdateRecurringTaskModal: React.FC<UpdateRecurringTaskModalProps> = ({ isOpen, onClose, task, onSave }) => {
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<'Not Yet Started' | 'In Progress' | 'Complete'>('Complete');

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicitly include title, category, and assignee in the update payload 
    // to ensure logs correctly identify the task in the spreadsheet.
    onSave({ 
      ...task, 
      status, 
      lastUpdateRemarks: remarks,
      title: task.title,
      category: task.category,
      assignee: task.assignee
    });
    
    setRemarks('');
    setStatus('Complete');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-indigo-600">Update Recurring Task</h2>
            <p className="text-sm text-gray-500 truncate max-w-[300px]">{task.title}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-black">Update Status *</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none"
                required
              >
                <option value="Not Yet Started">Not Yet Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Complete">Complete</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-black">Update Remarks *</label>
              <textarea 
                required
                rows={4}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                placeholder="Enter what was done..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
            {status === 'Complete' && (
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800">
                Marking as "Complete" will log this action and set the next due date based on the frequency ({task.frequencyDays} days).
              </div>
            )}
          </div>
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-all">Confirm Update</button>
          </div>
        </form>
      </div>
    </div>
  );
};
