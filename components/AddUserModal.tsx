
import React, { useState, useEffect } from 'react';
import { X, Plus, Eye, EyeOff, Trash2, Edit2, Layers } from 'lucide-react';
import { User, Designation, Department, Template, TemplateTask, Firm, Category } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { useLabels } from '../labelOverrides';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<User, 'id' | 'isActive'>, templateTasks?: TemplateTask[]) => void;
  designations: Designation[];
  departments: Department[];
  onAddDesignation: () => void;
  onAddDepartment: () => void;
  users: User[];
  templates: Template[];
  templateTasks: TemplateTask[];
  firms: Firm[];
  categories: Category[];
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  designations, 
  departments, 
  onAddDesignation, 
  onAddDepartment, 
  users,
  templates,
  templateTasks,
  firms,
  categories
}) => {
  const { getFieldLabel } = useLabels();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    mobile: '',
    designation: '',
    department: '',
    role: 'Employee',
    telegramUserName: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{name?: string, email?: string, mobile?: string, employeeId?: string}>({});
  
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [customizedTasks, setCustomizedTasks] = useState<TemplateTask[]>([]);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplateIds([]);
      setCustomizedTasks([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const tasks: TemplateTask[] = [];
    selectedTemplateIds.forEach(tid => {
      const templateTasksForId = templateTasks.filter(t => t.templateId === tid);
      tasks.push(...templateTasksForId.map(t => ({ ...t, id: Math.floor(Math.random() * 1000000) })));
    });
    setCustomizedTasks(tasks);
  }, [selectedTemplateIds, templateTasks]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateEmail = (email: string) => {
    if (!email.includes('@')) return "Please enter Correct Email Id";
    const parts = email.split('@');
    if (parts.length !== 2) return "Please enter Correct Email Id";
    const [localPart, domain] = parts;
    if (!domain.includes('.')) return "Please enter Correct Email Id";
    const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!regex.test(email)) return "Please enter Correct Email Id";
    if (localPart.startsWith('.') || localPart.endsWith('.')) return "Please enter Correct Email Id";
    if (localPart.includes('..')) return "Please enter Correct Email Id";
    if (email.includes(' ')) return "Please enter Correct Email Id";
    if (domain.startsWith('-') || domain.endsWith('-')) return "Please enter Correct Email Id";
    if (users.some(u => u.email.toLowerCase().trim() === email.toLowerCase().trim() && email.trim() !== '')) {
        return "This email is already associated with another user.";
    }
    return null;
  };

  const validate = () => {
      const newErrors: {name?: string, email?: string, mobile?: string, employeeId?: string} = {};
      if (users.some(u => u.name.toLowerCase().trim() === formData.name.toLowerCase().trim())) {
          newErrors.name = "This user name already exists.";
      }
      if (formData.employeeId && users.some(u => u.employeeId?.toLowerCase().trim() === formData.employeeId.toLowerCase().trim())) {
          newErrors.employeeId = "This Employee ID already exists.";
      }
      const emailError = validateEmail(formData.email);
      if (emailError) {
          newErrors.email = emailError;
      }
      const mobileRegex = /^\d{10}$/;
      if (!mobileRegex.test(formData.mobile)) {
          newErrors.mobile = "Please enter 10 Digit Number";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    onSave({
      name: formData.name,
      email: formData.email,
      employeeId: formData.employeeId,
      mobile: formData.mobile,
      designation: formData.designation,
      department: formData.department,
      role: formData.role,
      telegramUserName: formData.telegramUserName,
      password: formData.password
    }, customizedTasks);

    setFormData({
      name: '',
      email: '',
      employeeId: '',
      mobile: '',
      designation: '',
      department: '',
      role: 'Employee',
      telegramUserName: '',
      password: ''
    });
    onClose();
  };

  const designationOptions = designations.map(d => ({ value: d.title, label: d.title }));
  const departmentOptions = departments.map(d => ({ value: d.name, label: d.name }));
  const templateOptions = templates.map(t => ({ value: String(t.id), label: t.name }));

  const handleRemoveTask = (index: number) => {
    setCustomizedTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateTask = (index: number, updates: Partial<TemplateTask>) => {
    setCustomizedTasks(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
    setEditingTaskIndex(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-indigo-600">Add User</h2>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-900">{getFieldLabel('user.name', 'Full Name')} <span className="text-red-500">*</span></label>
                  <input 
                    name="name"
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900 placeholder-gray-400 ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-900">{getFieldLabel('user.email', 'Email')} <span className="text-red-500">*</span></label>
                      <input 
                          name="email"
                          type="text" 
                          required
                          placeholder="Enter email"
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900 placeholder-gray-400 ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                      />
                      {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-900">{getFieldLabel('user.employeeId', 'Employee Id')}</label>
                      <input 
                          name="employeeId"
                          type="text"
                          placeholder="Enter employee ID"
                          value={formData.employeeId}
                          onChange={handleChange}
                          className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900 placeholder-gray-400 ${errors.employeeId ? 'border-red-500' : 'border-gray-200'}`}
                      />
                      {errors.employeeId && <p className="text-xs text-red-500">{errors.employeeId}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900">{getFieldLabel('user.mobile', 'Mobile Number')} <span className="text-red-500">*</span></label>
                    <input 
                        name="mobile"
                        type="text"
                        required
                        placeholder="10 digits"
                        value={formData.mobile}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900 placeholder-gray-400 ${errors.mobile ? 'border-red-500' : 'border-gray-200'}`}
                    />
                    {errors.mobile && <p className="text-xs text-red-500">{errors.mobile}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900">{getFieldLabel('user.telegramUserName', 'Telegram')}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-400">@</span>
                      <input 
                        name="telegramUserName"
                        type="text"
                        placeholder="username"
                        value={formData.telegramUserName}
                        onChange={handleChange}
                        className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900 placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900">{getFieldLabel('user.designation', 'Designation')}</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchableSelect 
                          options={designationOptions}
                          value={formData.designation}
                          onChange={(val) => setFormData(prev => ({...prev, designation: val}))}
                          placeholder="Select..."
                        />
                      </div>
                      <button type="button" onClick={onAddDesignation} className="px-3 py-2 text-gray-500 hover:text-indigo-600 border border-gray-200 hover:bg-indigo-50 rounded-lg h-[42px]"><Plus size={18} /></button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900">{getFieldLabel('user.department', 'Department')}</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchableSelect 
                          options={departmentOptions}
                          value={formData.department}
                          onChange={(val) => setFormData(prev => ({...prev, department: val}))}
                          placeholder="Select..."
                        />
                      </div>
                      <button type="button" onClick={onAddDepartment} className="px-3 py-2 text-gray-500 hover:text-indigo-600 border border-gray-200 hover:bg-indigo-50 rounded-lg h-[42px]"><Plus size={18} /></button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900">{getFieldLabel('user.role', 'Role')} <span className="text-red-500">*</span></label>
                    <select name="role" required value={formData.role} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none appearance-none text-gray-900">
                      <option value="Employee">Employee</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-900">{getFieldLabel('user.password', 'Password')} <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input name="password" type={showPassword ? "text" : "password"} required placeholder="Enter password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg outline-none text-gray-900 placeholder-gray-400" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Assignment Section */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Layers size={16} className="text-indigo-600" />
                    Assign Templates
                  </label>
                  <div className="bg-white rounded-lg border border-gray-200 p-2 min-h-[100px] max-h-[150px] overflow-y-auto space-y-1">
                    {templates.map(t => (
                      <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedTemplateIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTemplateIds(p => [...p, t.id]);
                            else setSelectedTemplateIds(p => p.filter(id => id !== t.id));
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">{t.name}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">{t.type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-sm font-bold text-gray-900 mb-2">Task Preview ({customizedTasks.length})</label>
                  <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-bold text-gray-700">Task</th>
                          <th className="px-3 py-2 font-bold text-gray-700">Freq</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {customizedTasks.map((task, idx) => (
                          <tr key={idx} className="group hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <p className="font-medium text-gray-800 line-clamp-1">{task.title}</p>
                              <p className="text-[10px] text-gray-500 uppercase">{task.firm}</p>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{task.frequencyType}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                                <button type="button" onClick={() => setEditingTaskIndex(idx)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={12} /></button>
                                <button type="button" onClick={() => handleRemoveTask(idx)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Add User & Tasks</button>
          </div>
        </form>

        {/* Inline Task Editor Modal */}
        {editingTaskIndex !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Task for this User</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                  <input
                    type="text"
                    value={customizedTasks[editingTaskIndex].title}
                    onChange={(e) => handleUpdateTask(editingTaskIndex, { title: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Frequency</label>
                    <select
                      value={customizedTasks[editingTaskIndex].frequencyType}
                      onChange={(e) => handleUpdateTask(editingTaskIndex, { frequencyType: e.target.value as any })}
                      className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                    >
                      <option value="Fixed Days">Fixed Days</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Goal</label>
                    <input
                      type="number"
                      value={customizedTasks[editingTaskIndex].goal}
                      onChange={(e) => handleUpdateTask(editingTaskIndex, { goal: parseInt(e.target.value) })}
                      className="w-full p-2.5 border border-gray-200 rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Firm</label>
                  <SearchableSelect
                    options={firms.map(f => f.name)}
                    value={customizedTasks[editingTaskIndex].firm || ''}
                    onChange={val => handleUpdateTask(editingTaskIndex, { firm: val })}
                  />
                </div>
              </div>
              <button onClick={() => setEditingTaskIndex(null)} className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

