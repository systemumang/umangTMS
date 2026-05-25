import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { StatusMaster } from '../types';
import { useLabels } from '../labelOverrides';

interface AddStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Omit<StatusMaster, 'id'>) => void;
  initialData?: StatusMaster | null;
  statuses: StatusMaster[];
}

export const AddStatusModal: React.FC<AddStatusModalProps> = ({ isOpen, onClose, onSave, initialData, statuses }) => {
  const { getFieldLabel } = useLabels();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialData?.name || '');
    setError('');
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;

    const exists = statuses.some(s => s.id !== initialData?.id && String(s.name).trim().toLowerCase() === clean.toLowerCase());
    if (exists) {
      setError('This status already exists.');
      return;
    }

    onSave({ name: clean, is_system: initialData?.is_system ? 1 : 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600">{initialData ? 'Edit Status' : 'Add Status'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{getFieldLabel('status.name', 'Status Name')} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none ${error ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Enter status name"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">{initialData ? 'Save Changes' : 'Add Status'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
