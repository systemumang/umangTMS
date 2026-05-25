
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, LayoutGrid, LayoutList, FileText, Download } from 'lucide-react';
import { UserTable } from './UserTable';
import { AddUserModal } from './AddUserModal';
import { UpdateUserModal } from './UpdateUserModal';
import { User, Designation } from '../types';
import { useLabels } from '../labelOverrides';

interface UsersViewProps {
  users: User[];
  designations: Designation[];
  onAddUser: (user: Omit<User, 'id' | 'isActive'>) => void;
  onEditUser: (user: User) => void;
  onToggleStatus: (id: number) => void;
  onDeleteUser: (id: number) => void;
  onAddDesignation: () => void;
  sidebarCollapsed?: boolean;
}

export const UsersView: React.FC<UsersViewProps> = ({ users, designations, onAddUser, onEditUser, onToggleStatus, onDeleteUser, onAddDesignation, sidebarCollapsed = false }) => {
  const { getViewLabel } = useLabels();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'table'>('card');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const startEntry = filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endEntry = Math.min(currentPage * itemsPerPage, filteredUsers.length);
  const handleExportExcel = () => {
    const csv = [
      'S.No.,Name,Email,Mobile,Designation,Role,Status',
      ...filteredUsers.map((u, i) => `${i + 1},"${String(u.name || '').replace(/"/g, '""')}","${String(u.email || '').replace(/"/g, '""')}","${String(u.mobile || '').replace(/"/g, '""')}","${String(u.designation || '').replace(/"/g, '""')}","${String(u.role || '').replace(/"/g, '""')}","${u.isActive ? 'Active' : 'Inactive'}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Users_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };
	  const handleExportPDF = async () => {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
	    const doc = new jsPDF('l', 'mm', 'a4');
	    doc.text('Users', 14, 14);
	    autoTable(doc, {
	      head: [['S.No.', 'Name', 'Email', 'Mobile', 'Designation', 'Role', 'Status']],
	      body: filteredUsers.map((u, i) => [i + 1, u.name || '-', u.email || '-', u.mobile || '-', u.designation || '-', u.role || '-', u.isActive ? 'Active' : 'Inactive']),
	      startY: 20
	    });
	    doc.save(`Users_${new Date().toISOString().split('T')[0]}.pdf`);
	  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3 md:gap-4">
        <div className={sidebarCollapsed ? 'pl-14 md:pl-16' : ''}>
          <h2 className="text-2xl font-bold text-indigo-600">{getViewLabel('users', 'Users')}</h2>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm"
          title="Add User"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:max-w-xl">
          <Search className="absolute left-3 top-2.5 text-indigo-600" size={18} />
          <input 
            type="text" 
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-indigo-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-lg md:hidden">
                <button
                onClick={() => setMobileViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${mobileViewMode === 'card' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                >
                <LayoutGrid size={18} />
                </button>
                <button
                onClick={() => setMobileViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${mobileViewMode === 'table' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                >
                <LayoutList size={18} />
                </button>
            </div>

            <button 
            onClick={() => setIsAddModalOpen(true)}
            className="hidden md:flex flex-1 md:flex-none items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
            >
            <Plus size={16} />
            <span>Add User</span>
            </button>
            <button onClick={handleExportPDF} title="Export PDF" className="hidden md:flex items-center justify-center p-2.5 bg-indigo-500 text-white border border-indigo-600 rounded-md hover:bg-indigo-600"><Download size={16} /></button>
            <button onClick={handleExportExcel} title="Export Excel" className="hidden md:flex items-center justify-center p-2.5 bg-indigo-600 text-white border border-indigo-700 rounded-md hover:bg-indigo-700"><FileText size={16} /></button>
        </div>
      </div>

      <UserTable 
        users={paginatedUsers} 
        onToggleStatus={onToggleStatus} 
        onDeleteUser={onDeleteUser} 
        onEditUser={handleEditClick}
        viewMode={mobileViewMode}
      />
      
       <div className="flex justify-between items-center text-xs text-indigo-600 font-bold px-1 uppercase tracking-wider">
          <span>Showing {startEntry} to {endEntry} of {filteredUsers.length} entries</span>
          <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase text-[10px]" 
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 disabled:opacity-50 transition-colors uppercase text-[10px]"
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
              </button>
          </div>
      </div>

      <AddUserModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onAddUser}
        designations={designations}
        onAddDesignation={onAddDesignation}
        users={users}
      />

      <UpdateUserModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={selectedUser}
        onUpdate={onEditUser}
        designations={designations}
        onAddDesignation={onAddDesignation}
        users={users}
      />
    </div>
  );
};
