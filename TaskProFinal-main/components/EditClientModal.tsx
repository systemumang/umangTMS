
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Client } from '../types';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  client: Client | null;
  clients: Client[];
}

export const EditClientModal: React.FC<EditClientModalProps> = ({ isOpen, onClose, onSave, client, clients }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    gstNumber: ''
  });
  const [errors, setErrors] = useState<{name?: string, email?: string, mobile?: string, gstNumber?: string}>({});

  useEffect(() => {
      if (client) {
          setFormData({
              name: client.name,
              email: client.email,
              mobile: client.mobile,
              address: client.address,
              gstNumber: client.gstNumber || ''
          });
          setErrors({});
      }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateGst = (gst: string) => {
    if (!gst) return null;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gst)) return "Invalid GST format";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: any = {};
    
    if (clients.some(c => c.id !== client.id && c.name.toLowerCase().trim() === formData.name.toLowerCase().trim())) {
      newErrors.name = "This client name already exists.";
    }

    const mobileRegex = /^\d{10}$/;
    if (formData.mobile && !mobileRegex.test(formData.mobile)) {
        newErrors.mobile = "Please enter 10 Digit Number";
    }

    const gstError = validateGst(formData.gstNumber);
    if (gstError) newErrors.gstNumber = gstError;

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
    }

    if (formData.name.trim() === '') return;

    onSave({ ...client, ...formData });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-indigo-600">Edit Client</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-900">Client Name *</label>
              <input 
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900 ${errors.name ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="e.g. Acme Corp"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-900">GST Number</label>
              <input 
                name="gstNumber"
                type="text"
                value={formData.gstNumber}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900 uppercase ${errors.gstNumber ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="GSTIN"
              />
              {errors.gstNumber && <p className="text-xs text-red-500">{errors.gstNumber}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                <label className="text-sm font-medium text-gray-900">Email</label>
                <input 
                    name="email"
                    type="text"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900"
                    placeholder="contact@example.com"
                />
                </div>
                <div className="space-y-1">
                <label className="text-sm font-medium text-gray-900">Mobile</label>
                <input 
                    name="mobile"
                    type="text"
                    value={formData.mobile}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900 ${errors.mobile ? 'border-red-500' : 'border-gray-200'}`}
                    placeholder="10 digits"
                />
                 {errors.mobile && <p className="text-xs text-red-500">{errors.mobile}</p>}
                </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-900">Address</label>
              <textarea 
                name="address"
                rows={3}
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none text-gray-900 resize-none"
                placeholder="Office Address..."
              ></textarea>
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
