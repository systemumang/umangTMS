
import React, { useState, useEffect } from 'react';
import { X, Plus, Info, AlertTriangle } from 'lucide-react';
import { Task, User, Category, Project, Vendor, VendorCategory } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave: (task: Task) => void;
  onAddCategory: () => void;
  onAddProject: () => void;
  onAddVendorCategory: () => void;
  users: User[];
  categories: Category[];
  projects: Project[];
  vendors: Vendor[];
  vendorCategories?: VendorCategory[];
  isVendorView?: boolean;
  lastAddedCategory?: string;
  lastAddedProject?: string;
  lastAddedVendorCategory?: string;
  onClearLastAdded?: () => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ 
  isOpen, 
  onClose, 
  task,
  onSave, 
  onAddCategory, 
  onAddProject,
  onAddVendorCategory,
  users, 
  categories, 
  projects, 
  vendors,
  vendorCategories = [],
  isVendorView = false,
  lastAddedCategory = '',
  lastAddedProject = '',
  lastAddedVendorCategory = '',
  onClearLastAdded
}) => {
  const [formData, setFormData] = useState<{
    title: string;
    assignees: string[]; 
    owner: string;
    project: string; // Combined 'Project Name (Client Name)'
    category: string;
    dueDate: string;
    vendor: string;
    vendorCategory: string[]; 
    notes: string;
    priority: string;
  }>({
    title: '',
    assignees: [],
    owner: '',
    project: '',
    category: '',
    dueDate: '',
    vendor: '',
    vendorCategory: [],
    notes: '',
    priority: 'Medium'
  });
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
        let formattedDate = task.dueDate || '';
        if (formattedDate.includes('/')) {
            const parts = formattedDate.split('/');
            if (parts.length === 3) {
                formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }

        // Project value should already be in 'Name (Client)' format from App.tsx normalization
        // If not, construct it for consistency in the selector
        let currentProjectValue = task.project || '';
        if (currentProjectValue && !currentProjectValue.includes('(') && task.clientName) {
            currentProjectValue = `${currentProjectValue.trim()} (${task.clientName.trim()})`;
        }

        setFormData({
            title: task.title,
            assignees: task.assignees ? task.assignees.split(',').map(s => s.trim()) : [],
            owner: task.owner,
            project: currentProjectValue, // Use the combined format for project selector
            category: task.category || '',
            dueDate: formattedDate,
            vendor: task.vendor || '',
            vendorCategory: task.vendorCategory ? task.vendorCategory.split(',').map(s => s.trim()) : [],
            notes: task.remarks || '',
            priority: task.priority
        });
        setIsConfirming(false);
    }
  }, [task, isOpen]);

  // Handle instant pre-selection when props change (Category, Project etc)
  useEffect(() => {
    if (isOpen) {
        if (lastAddedCategory) {
            setFormData(prev => ({ ...prev, category: lastAddedCategory }));
            onClearLastAdded?.();
        }
        if (lastAddedProject) {
            setFormData(prev => ({ ...prev, project: lastAddedProject }));
            onClearLastAdded?.();
        }
        if (lastAddedVendorCategory) {
            setFormData(prev => {
                const current = Array.isArray(prev.vendorCategory) ? prev.vendorCategory : [];
                return { ...prev, vendorCategory: [...current, lastAddedVendorCategory] };
            });
            onClearLastAdded?.();
        }
    }
  }, [categories, projects, vendorCategories, isOpen, lastAddedCategory, lastAddedProject, lastAddedVendorCategory]);

  if (!isOpen || !task) return null;

  const isVendorMode = isVendorView || (!!task.vendor && task.vendor.trim() !== '');

  const activeUsers = users.filter(u => u.isActive);
  const userOptions = activeUsers.map(u => ({ value: u.name, label: u.name }));
  const projectOptions = projects.map(p => {
    const constructed = `${p.name.trim()} (${p.client.trim()})`;
    return { value: constructed, label: constructed };
  });
  const vendorOptions = vendors.map(v => ({ value: v.name, label: v.name }));
  const categoryOptions = categories.map(c => ({ value: c.name, label: c.name }));
  const vendorCategoryOptions = (vendorCategories || []).map(c => ({ value: c.name, label: c.name }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    const basicValid = formData.title.trim() !== '' && 
                       formData.owner !== '' && 
                       formData.project !== ''; // Project is now required for all tasks

    if (isVendorMode) return basicValid && formData.vendor !== '';
    
    return basicValid && 
           formData.assignees.length > 0 && 
           formData.category !== '';
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setIsConfirming(true);
  };

  const handleFinalSave = () => {
    const updatedTask: Task = {
      ...task,
      title: formData.title,
      owner: formData.owner,
      remarks: formData.notes,
      dueDate: formData.dueDate,
      priority: formData.priority as any,
      project: formData.project, // Project is always saved as the combined string
    };

    if (isVendorMode) {
        updatedTask.vendor = formData.vendor;
        updatedTask.vendorCategory = Array.isArray(formData.vendorCategory) ? formData.vendorCategory.join(', ') : formData.vendorCategory;
        // For vendor tasks, assignees and category should be empty
        updatedTask.assignees = '';
        updatedTask.category = ''; 
    } else {
        updatedTask.assignees = formData.assignees.join(', ');
        updatedTask.category = formData.category;
        // For non-vendor tasks, vendor fields should be empty
        updatedTask.vendor = '';
        updatedTask.vendorCategory = '';
    }

    onSave(updatedTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200 border-2 border-indigo-400">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600">{isConfirming ? 'Confirm Changes' : (isVendorMode ? 'Edit Vendor Task' : 'Edit Task')}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {isConfirming ? (
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-indigo-50 rounded-full text-indigo-600">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-xl font-bold text-black">Are you sure?</h3>
            </div>
            <div className="flex gap-4 pt-6">
              <button onClick={() => setIsConfirming(false)} className="flex-1 px-8 py-4 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-colors uppercase tracking-widest border border-indigo-200">Go Back</button>
              <button onClick={handleFinalSave} className="flex-1 px-8 py-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl transition-all uppercase tracking-widest">Save Changes</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePreSubmit}>
            <div className="p-6 space-y-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-32">
                  <label className="text-sm font-medium text-black block mb-1">Date</label>
                  <input type="text" readOnly value={task.date} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-black cursor-not-allowed text-center font-medium" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-black block mb-1">Task <span className="text-red-500">*</span></label>
                  <input name="title" type="text" required value={formData.title} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-black font-medium" />
                </div>
                <div className="w-full md:w-40">
                  <label className="text-sm font-medium text-black block mb-1">Priority <span className="text-red-500">*</span></label>
                  <select name="priority" value={formData.priority} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-black font-medium focus:ring-2 focus:ring-indigo-100 outline-none">
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* Project Selector - always visible now */}
              <div className="space-y-1">
                  <label className="text-sm font-medium text-black block mb-1">Project <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                      <div className="flex-1">
                          <SearchableSelect options={projectOptions} value={formData.project} onChange={(val) => setFormData(prev => ({ ...prev, project: val }))} placeholder="Select Project..." required />
                      </div>
                      <button type="button" onClick={onAddProject} className="px-3 py-2 text-gray-500 hover:text-indigo-600 border border-gray-200 hover:bg-indigo-50 rounded-lg h-[42px]"><Plus size={18} /></button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isVendorMode ? (
                      <>
                        <div className="space-y-1">
                            <SearchableSelect label="Task Owner" options={userOptions} value={formData.owner} onChange={(val) => setFormData(prev => ({ ...prev, owner: val }))} multiple={false} placeholder="Select Owner..." required />
                        </div>
                        <div className="space-y-1">
                            <SearchableSelect label="Vendor" options={vendorOptions} value={formData.vendor} onChange={(val) => setFormData(prev => ({ ...prev, vendor: val }))} placeholder="Select Vendor..." required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-black block mb-1">Vendor Category</label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <SearchableSelect
                                        options={vendorCategoryOptions}
                                        value={formData.vendorCategory}
                                        onChange={(val) => setFormData(prev => ({ ...prev, vendorCategory: val }))}
                                        multiple={true}
                                        placeholder="Select Categories..."
                                    />
                                </div>
                                <button type="button" onClick={onAddVendorCategory} className="px-3 py-2 text-gray-500 hover:text-indigo-600 border border-gray-200 hover:bg-indigo-50 rounded-lg h-[42px]"><Plus size={18} /></button>
                            </div>
                        </div>
                      </>
                  ) : (
                      <>
                        <div className="space-y-1">
                            <SearchableSelect label="Assignees" options={userOptions} value={formData.assignees} onChange={(val) => setFormData(prev => ({ ...prev, assignees: val }))} multiple={true} placeholder="Select Assignees..." required />
                        </div>
                        <div className="space-y-1">
                            <SearchableSelect label="Task Owner" options={userOptions} value={formData.owner} onChange={(val) => setFormData(prev => ({ ...prev, owner: val }))} multiple={false} placeholder="Select Owner..." required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-black block mb-1">Category <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <SearchableSelect options={categoryOptions} value={formData.category} onChange={(val) => setFormData(prev => ({ ...prev, category: val }))} placeholder="Select Category..." required />
                                </div>
                                <button type="button" onClick={onAddCategory} className="px-3 py-2 text-gray-500 hover:text-indigo-600 border border-gray-200 hover:bg-indigo-50 rounded-lg h-[42px]"><Plus size={18} /></button>
                            </div>
                        </div>
                      </>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-black block mb-1">Due Date <span className="text-red-500">*</span></label>
                  <input name="dueDate" type="date" required value={formData.dueDate} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-black font-medium" />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-black block mb-1">Notes</label>
                <textarea name="notes" rows={4} value={formData.notes} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-black font-medium resize-none"></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">Cancel</button>
              {isFormValid() && (
                  <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transition-all">Save Changes</button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
