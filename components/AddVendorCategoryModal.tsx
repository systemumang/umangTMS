import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { VendorCategory } from '../types';

interface AddVendorCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Omit<VendorCategory, 'id'>) => void;
  initialData?: VendorCategory | null;
  vendorCategories: VendorCategory[];
}

export const AddVendorCategoryModal: React.FC<AddVendorCategoryModalProps> = ({ isOpen, onClose, onSave, initialData, vendorCategories }) => {
  const [formData, setFormData] = useState({
    name: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({ name: initialData.name });
    } else {
      setFormData({ name: '' });
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Uniqueness check
    const isDuplicate = vendorCategories.some(vc => 
      vc.id !== initialData?.id && 
      vc.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
    );

    if (isDuplicate) {
      setError('This vendor category name already exists.');
      return;
    }

    onSave({ name: formData.name });
    setFormData({ name: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600">{initialData ? 'Edit Vendor Category' : 'Add Vendor Category'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-600">Name *</label>
              <input 
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-600 ${error ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="e.g. Electrical"
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
          </div>
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm">{initialData ? 'Save Changes' : 'Add Category'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};