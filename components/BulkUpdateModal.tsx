
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Task, User, Vendor, Category } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface BulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  onUpdate: (updates: Partial<Task>) => void;
  users: User[];
  vendors?: Vendor[];
  categories?: Category[];
  isVendorView?: boolean;
  mode: 'status' | 'priority' | 'assignee' | 'category';
}

export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({ 
  isOpen, 
  onClose, 
  count, 
  onUpdate, 
  users, 
  vendors = [],
  categories = [],
  isVendorView = false,
  mode
}) => {
  const [formData, setFormData] = useState<{status: string; priority: string; remarks: string; category: string}>({
    status: '',
    priority: '',
    remarks: '',
    category: ''
  });
  const [reassignSelection, setReassignSelection] = useState<string | string[]>(isVendorView ? '' : []);
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setFormData({ status: '', priority: '', remarks: '', category: '' });
        setReassignSelection(isVendorView ? '' : []);
        setError('');
        setIsConfirming(false);
    }
  }, [isOpen, mode, isVendorView]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let hasValidInput = false;
    if (mode === 'status' && formData.status) hasValidInput = true;
    if (mode === 'priority' && formData.priority) hasValidInput = true;
    if (mode === 'category' && formData.category) hasValidInput = true;
    if (mode === 'assignee') {
        const selCount = Array.isArray(reassignSelection) ? reassignSelection.length : (reassignSelection ? 1 : 0);
        if (selCount > 0) hasValidInput = true;
    }

    if (!hasValidInput) {
        setError('Please select a value to update.');
        return;
    }

    if (mode === 'status' && (formData.status === 'In Progress' || formData.status === 'Pending for Client' || formData.status === 'Pending for Owner') && (!formData.remarks || formData.remarks.trim() === '')) {
        setError('Update remark is required for this status change.');
        return;
    }

    setIsConfirming(true);
  };

  const handleFinalSubmit = () => {
    const updates: any = {};
    if (mode === 'status' && formData.status) {
        updates.status = formData.status;
        updates.lastUpdateRemarks = formData.remarks;
    }
    if (mode === 'priority' && formData.priority) {
        updates.priority = formData.priority;
        updates.lastUpdateRemarks = `Bulk Priority change to ${formData.priority}`;
    }
    if (mode === 'category' && formData.category) {
        updates.category = formData.category;
        updates.lastUpdateRemarks = `Bulk Category change to ${formData.category}`;
    }
    if (mode === 'assignee') {
        const val = Array.isArray(reassignSelection) ? reassignSelection.join(', ') : reassignSelection;
        if (val) {
            if (isVendorView) updates.vendor = val;
            else updates.assignees = val;
            updates.lastUpdateRemarks = `Bulk Assignee change to ${val}`;
        }
    }
    
    onUpdate(updates);
    onClose();
  };

  const userOptions = users.filter(u => u.isActive).map(u => ({ value: u.name, label: u.name }));
  const vendorOptions = vendors.map(v => ({ value: v.name, label: v.name }));
  const categoryOptions = categories.map(c => ({ value: c.name, label: c.name }));

  const getTitle = () => {
    switch(mode) {
        case 'status': return 'Bulk Status Update';
        case 'priority': return 'Bulk Priority Update';
        case 'category': return 'Bulk Category Update';
        case 'assignee': return isVendorView ? 'Bulk Vendor Update' : 'Bulk Assignee Update';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600">{isConfirming ? 'Confirm Update' : getTitle()}</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {isConfirming ? (
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-amber-50 rounded-full text-amber-600">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Are you sure?</h3>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsConfirming(false)} className="flex-1 px-6 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors uppercase tracking-wider">Go Back</button>
              <button onClick={handleFinalSubmit} className="flex-1 px-6 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all uppercase tracking-wider">Confirm & Apply</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePreSubmit}>
            <div className="p-6 space-y-6">
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <p className="text-sm text-indigo-700 font-bold uppercase tracking-wider">Updating {count} tasks</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">{error}</div>
              )}

              {mode === 'status' && (
                  <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-900 block mb-1">New Status</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                          <option value="">Select Status...</option>
                          <option value="Not Yet Started">Not Yet Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Pending for Client">Pending for Client</option>
                          <option value="Pending for Owner">Pending for Owner</option>
                          <option value="Completed">Completed</option>
                      </select>
                  </div>
              )}

              {mode === 'priority' && (
                  <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-900 block mb-1">New Priority</label>
                      <select name="priority" value={formData.priority} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                          <option value="">Select Priority...</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                      </select>
                  </div>
              )}

              {mode === 'category' && (
                  <div className="space-y-1">
                      <SearchableSelect 
                        label="New Category"
                        options={categoryOptions}
                        value={formData.category}
                        onChange={(val) => setFormData(prev => ({...prev, category: val}))}
                        placeholder="Select Category..."
                      />
                  </div>
              )}

              {mode === 'assignee' && (
                  <div className="space-y-1">
                      <SearchableSelect 
                          label={isVendorView ? "New Vendor" : "New Assignees"}
                          options={isVendorView ? vendorOptions : userOptions}
                          value={reassignSelection}
                          onChange={setReassignSelection}
                          multiple={!isVendorView} 
                          placeholder={isVendorView ? "Select Vendor..." : "Select Assignees..."}
                      />
                  </div>
              )}

              {mode === 'status' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-900 block mb-1">
                      Update Remark {(formData.status === 'In Progress' || formData.status === 'Pending for Client' || formData.status === 'Pending for Owner') && <span className="text-red-500">*</span>}
                  </label>
                  <textarea name="remarks" rows={3} placeholder="Details of why this bulk update is being performed..." value={formData.remarks} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 resize-none focus:ring-2 focus:ring-indigo-100 outline-none"></textarea>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-all uppercase tracking-wider font-bold">Apply Updates</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};