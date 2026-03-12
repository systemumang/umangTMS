import React from 'react';
import { X } from 'lucide-react';
import { Project, Client } from '../types';

interface ClientProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  projects: Project[];
  onNavigateToProjectTasks?: (projectName: string) => void;
}

export const ClientProjectsModal: React.FC<ClientProjectsModalProps> = ({ isOpen, onClose, client, projects, onNavigateToProjectTasks }) => {
  if (!isOpen || !client) return null;

  const clientProjects = projects.filter(p => p.client === client.name);

  const handleProjectClick = (projectName: string) => {
      if (onNavigateToProjectTasks) {
          onNavigateToProjectTasks(projectName);
          onClose();
      }
  };

  const thClass = "px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider border-r border-indigo-500 last:border-r-0";
  const tdClass = "px-6 py-4 text-sm text-gray-900 border-r border-black last:border-r-0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
             <h2 className="text-xl font-bold text-indigo-600">Client Projects</h2>
             <p className="text-sm text-gray-500">{client.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-0">
           {clientProjects.length > 0 ? (
               <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-indigo-600">
                            <tr>
                                <th className={thClass}>Project Name</th>
                                <th className={thClass}>Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                            {clientProjects.map(project => (
                                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                                    <td className={tdClass}>
                                        <div className="flex items-center space-x-3">
                                            <button 
                                                onClick={() => handleProjectClick(project.name)}
                                                className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left pl-2"
                                            >
                                                {project.name}
                                            </button>
                                        </div>
                                    </td>
                                    <td className={tdClass}>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${project.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {project.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
               </div>
           ) : (
               <div className="text-center py-8 text-gray-500">
                   No projects found for this client.
               </div>
           )}
        </div>
        
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
            <button onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
                Close
            </button>
        </div>
      </div>
    </div>
  );
};
