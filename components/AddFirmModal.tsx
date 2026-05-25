import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Firm } from '../types';
import { useLabels } from '../labelOverrides';

interface AddFirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (firm: Omit<Firm, 'id'>) => void;
  initialData?: Firm | null;
  firms: Firm[];
}

export const AddFirmModal: React.FC<AddFirmModalProps> = ({ isOpen, onClose, onSave, initialData, firms }) => {
  const { getFieldLabel } = useLabels();
  const [name, setName] = useState('');
  const [sortName, setSortName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialData?.name || '');
    setSortName(initialData?.sortName || '');
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanSortName = sortName.trim();
    if (!cleanName) return;
    if (!cleanSortName) {
      setError('Short is required.');
      return;
    }

    const isDuplicate = firms.some(f => f.id !== initialData?.id && f.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (isDuplicate) {
      setError('This firm name already exists.');
      return;
    }

    onSave({ name: cleanName, sortName: cleanSortName });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600">{initialData ? 'Edit Firm' : 'Add Firm'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{getFieldLabel('firm.name', 'Firm Name')} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none ${error ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Enter firm name"
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{getFieldLabel('firm.sortName', 'Short')} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={sortName}
                onChange={(e) => {
                  setSortName(e.target.value);
                  if (error === 'Short is required.') setError('');
                }}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none ${error === 'Short is required.' ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Enter short"
              />
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">
              {initialData ? 'Save Changes' : 'Add Firm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
