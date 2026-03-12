import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Project, Client } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  project: Project | null;
  clients: Client[];
  onAddClient: () => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ isOpen, onClose, onSave, project, clients, onAddClient }) => {
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    status: 'Active',
    telegramGroupId: '',
    whatsappGroupId: '',
    projectEmail: ''
  });

  useEffect(() => {
    if (project) {
        setFormData({
            name: project.name,
            client: project.client,
            status: project.status,
            telegramGroupId: project.telegramGroupId || '',
            whatsappGroupId: project.whatsappGroupId || '',
            projectEmail: project.projectEmail || ''
        });
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const clientOptions = clients.map(c => ({ value: c.name, label: c.name }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...project, ...formData });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600">Edit Project</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block mb-1">Project Name <span className="text-red-500">*</span></label>
              <input 
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-600"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block mb-1">Client Name <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <div className="flex-1">
                   <SearchableSelect
                      options={clientOptions}
                      value={formData.client}
                      onChange={(val) => setFormData(prev => ({ ...prev, client: val }))}
                      placeholder="Select Client..."
                      required
                    />
                </div>
                <button 
                  type="button" 
                  onClick={onAddClient}
                  className="px-3 py-2 text-gray-500 hover:text-indigo-600 border border-gray-200 hover:bg-indigo-50 rounded-lg transition-colors h-[42px]"
                  title="Add New Client"
                >
                    <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block mb-1">Project Email</label>
              <input 
                name="projectEmail"
                type="email"
                value={formData.projectEmail}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900"
                placeholder="project@company.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 block mb-1">Telegram Group ID</label>
                    <input 
                        name="telegramGroupId"
                        type="text"
                        value={formData.telegramGroupId}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900"
                        placeholder="-100xxxxxxx"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-600 block mb-1">WhatsApp Group ID</label>
                    <input 
                        name="whatsappGroupId"
                        type="text"
                        value={formData.whatsappGroupId}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900"
                        placeholder="group_invite_id"
                    />
                </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600 block mb-1">Status</label>
              <div className="relative">
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none appearance-none text-gray-600"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Completed">Completed</option>
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};