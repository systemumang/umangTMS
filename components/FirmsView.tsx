import React, { useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Firm } from '../types';
import { AddFirmModal } from './AddFirmModal';

interface FirmsViewProps {
  firms: Firm[];
  onAddFirm: () => void;
  onDeleteFirm: (id: number) => void;
  onEditFirm: (firm: Firm) => void;
  sidebarCollapsed?: boolean;
}

export const FirmsView: React.FC<FirmsViewProps> = ({ firms, onAddFirm, onDeleteFirm, onEditFirm, sidebarCollapsed = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return firms;
    return firms.filter(f =>
      f.name.toLowerCase().includes(term) ||
      String(f.sortName || '').toLowerCase().includes(term)
    );
  }, [firms, searchTerm]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className={sidebarCollapsed ? 'pl-14 md:pl-16' : ''}>
          <h2 className="text-2xl font-bold text-indigo-600">Firms</h2>
          <p className="text-sm text-gray-500 mt-1">Manage firm list for firm-wise tasks</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-300 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:max-w-xl">
          <Search className="absolute left-3 top-2.5 text-indigo-600" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search firms..."
            className="w-full pl-10 pr-4 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm"
          />
        </div>
        <button onClick={onAddFirm} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium shadow-sm">
          <Plus size={16} />
          <span>Add Firm</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-black shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-600 border-b border-indigo-700">
                <th className="px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider border-r border-indigo-500">S.No.</th>
                <th className="px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider border-r border-indigo-500">Firm Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider border-r border-indigo-500">Sort Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {filtered.map((firm, index) => (
                <tr key={firm.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 border-r border-black">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-black">{firm.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 border-r border-black">{firm.sortName || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedFirm(firm);
                          setIsEditOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 p-1.5 rounded-md border border-indigo-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDeleteFirm(firm.id)} className="text-red-500 hover:text-red-700 transition-colors bg-red-50 p-1.5 rounded-md border border-red-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No firms found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddFirmModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialData={selectedFirm}
        firms={firms}
        onSave={(payload) => {
          if (!selectedFirm) return;
          onEditFirm({ ...selectedFirm, ...payload });
          setIsEditOpen(false);
        }}
      />
    </div>
  );
};
