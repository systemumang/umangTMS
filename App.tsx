
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Footer } from './components/Footer';
import { Dashboard } from './components/Dashboard';
import { TasksView } from './components/TasksView';
import { UsersView } from './components/UsersView';
import { DesignationsView } from './components/DesignationsView';
import { CategoriesView } from './components/CategoriesView';
import { VendorCategoriesView } from './components/VendorCategoriesView';
import { ProjectsView } from './components/ProjectsView';
import { ClientsView } from './components/ClientsView';
import { VendorsView } from './components/VendorsView';
import { ActionLogView } from './components/ActionLogView';
import { ActivityDashboardView } from './components/ActivityDashboardView';
import { RecurringTasksView } from './components/RecurringTasksView';
import { RecurringTaskActionsView } from './components/RecurringTaskActionsView';
import { UpdateMultipleView } from './components/UpdateMultipleView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { AddTaskModal } from './components/AddTaskModal';
import { AddCategoryModal } from './components/AddCategoryModal';
import { AddVendorCategoryModal } from './components/AddVendorCategoryModal';
import { AddProjectModal } from './components/AddProjectModal';
import { AddUserModal } from './components/AddUserModal';
import { AddClientModal } from './components/AddClientModal';
import { AddVendorModal } from './components/AddVendorModal';
import { AddDesignationModal } from './components/AddDesignationModal';
import { EditProjectModal } from './components/EditProjectModal';
import { EditClientModal } from './components/EditClientModal';
import { EditVendorModal } from './components/EditVendorModal';
import { TaskHistoryModal } from './components/TaskHistoryModal';
import { RecurringTaskHistoryModal } from './components/RecurringTaskHistoryModal';
import { AddRecurringTaskModal } from './components/AddRecurringTaskModal';
import { UpdateRecurringTaskModal } from './components/UpdateRecurringTaskModal';
import { EditRecurringTaskModal } from './components/EditRecurringTaskModal';
import { TelegramSetupView } from './components/TelegramSetupView'; 
import { 
  LayoutDashboard, 
  CheckSquare, 
  Clock, 
  CheckCircle, 
  Users, 
  Briefcase, 
  Tags, 
  Folder, 
  FileText,
  Building2,
  Truck,
  Layers,
  Menu,
  RotateCcw,
  History,
  Settings,
  AlertCircle,
  X,
  Hammer,
  Send,
  ListChecks,
  BarChart3
} from 'lucide-react';
import { NavItem, Task, User, Designation, Category, Project, Client, ActionLogEntry, Vendor, VendorCategory, RecurringTask, RecurringTaskAction, AppSettings } from './types';

const MASTER_REGISTRY_URL = "https://script.google.com/macros/s/AKfycbwMVcMdqWGSyqJGLQH9ld724K_kov5J35riarbzEiMAlnDTToig0CMv3chc-amHOa1F/exec";
const AUTO_SYNC_INTERVAL = 120000;

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'all-tasks', label: 'All Tasks', icon: <CheckSquare size={20} />, section: 'Tasks' },
  { id: 'pending', label: 'Pending Tasks', icon: <Clock size={20} />, section: 'Tasks' },
  { id: 'completed', label: 'Completed Tasks', icon: <CheckCircle size={20} />, section: 'Tasks' },
  { id: 'update-multiple', label: 'Update Multiple', icon: <ListChecks size={20} />, section: 'Tasks' },
  { id: 'activity-dashboard', label: 'Activity Dashboard', icon: <BarChart3 size={20} />, section: 'Tasks' },
  { id: 'action-log', label: 'Action Log', icon: <History size={20} />, section: 'Tasks' },
  { id: 'due-recurring-tasks', label: 'Due Recurring', icon: <AlertCircle size={20} />, section: 'Recurring Tasks' },
  { id: 'recurring-tasks', label: 'Recurring Rules', icon: <RotateCcw size={20} />, section: 'Recurring Tasks' },
  { id: 'recurring-actions', label: 'Recurring Log', icon: <History size={20} />, section: 'Recurring Tasks' },
  { id: 'pending-vendor-tasks', label: 'Vendor Pending', icon: <Hammer size={20} />, section: 'Vendor' },
  { id: 'vendor-tasks', label: 'Vendor All', icon: <Layers size={20} />, section: 'Vendor' },
  { id: 'completed-vendor-tasks', label: 'Vendor History', icon: <CheckCircle size={20} />, section: 'Vendor' },
  { id: 'vendor-action-log', label: 'Vendor Log', icon: <History size={20} />, section: 'Vendor' },
  { id: 'users', label: 'Users', icon: <Users size={20} />, section: 'Master' },
  { id: 'clients', label: 'Clients', icon: <Building2 size={20} />, section: 'Master' },
  { id: 'projects', label: 'Projects', icon: <Briefcase size={20} />, section: 'Master' },
  { id: 'categories', label: 'Categories', icon: <Tags size={20} />, section: 'Master' },
  { id: 'vendor-categories', label: 'Vendor Categories', icon: <Tags size={20} />, section: 'Master' },
  { id: 'vendors', label: 'Vendors', icon: <Truck size={20} />, section: 'Master' },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} />, section: 'Master' },
  { id: 'telegram-setup', label: 'Telegram Setup', icon: <Send size={20} />, section: 'Master' },
];

export const formatToIndianDate = (dateInput: any): string => {
  if (!dateInput) return '';
  const s = String(dateInput).trim();
  const match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) {
      return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
  }
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return s;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch { return s; }
};

export const formatToIndianDateTime = (dateInput: any): string => {
  if (!dateInput) return '';
  let s = String(dateInput).trim();
  const match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?)?/i);
  if (match) {
      const [_, d, m, y, hh, mm, ss, ampm] = match;
      const datePart = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      if (hh && mm) {
          return `${datePart} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}${ampm ? ' ' + ampm.toUpperCase() : ''}`;
      }
      return datePart;
  }
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return s;
    const datePart = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${datePart} ${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return s; }
};

export const parseToISO = (str: string) => {
    if (!str) return '';
    const trimmed = str.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.split(/[ T]/)[0];
    const datePart = trimmed.split(/[ T]/)[0];
    const parts = datePart.split(/[/-]/);
    if (parts.length !== 3) return trimmed;
    if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
};

async function safeJsonParse(response: Response, sourceName: string) {
  const text = await response.text();
  if (text.toLowerCase().includes("404 file not found") || text.includes("<!DOCTYPE html>")) {
    throw new Error(`Backend error in ${sourceName}.`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${sourceName} returned invalid format.`);
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('taskpro_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [workspaceId, setWorkspaceId] = useState<string>(() => localStorage.getItem('taskpro_workspace_id') || '');
  const [apiUrl, setApiUrl] = useState<string>(() => localStorage.getItem('taskpro_api_url') || '');

  const isAdmin = currentUser?.role === 'Admin';

  // Navigation Logic based on Role
  const filteredNavItems = useMemo(() => {
    if (isAdmin) return navItems;
    // Hide 'Master' section for Employees
    return navItems.filter(item => item.section !== 'Master');
  }, [isAdmin]);

  const [activeTab, setActiveTab] = useState(() => {
    return 'dashboard';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'side' | 'top'>(() => (localStorage.getItem('taskpro_layout') as any) || 'side');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLogEntry[]>([]);
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [recurringActions, setRecurringActions] = useState<RecurringTaskAction[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    officeTokenId: '', officeTelegramGroupId: '', whatsappGroupId: '', masId: '',
    masPassword: '', metaAccessToken: '', metaPhoneNumberId: '', metaWabaId: '', metaVerifyToken: ''
  });

  // Data subsets based on user role
  const visibleTasks = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return tasks;
    return tasks.filter(t => {
      const isOwner = String(t.owner || '').trim() === currentUser.name;
      const isAssignee = String(t.assignees || '').split(',').map(s => s.trim()).includes(currentUser.name);
      const isVendor = String(t.vendor || '').trim() === currentUser.name;
      return isOwner || isAssignee || isVendor;
    });
  }, [tasks, currentUser, isAdmin]);

  const visibleActionLogs = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return actionLogs;
    return actionLogs.filter(l => {
      const isOwner = String(l.owner || '').trim() === currentUser.name;
      const isAssignee = String(l.assignees || '').split(',').map(s => s.trim()).includes(currentUser.name);
      const isVendor = String(l.vendor || '').trim() === currentUser.name;
      return isOwner || isAssignee || isVendor;
    });
  }, [actionLogs, currentUser, isAdmin]);

  const visibleRecurringTasks = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return recurringTasks;
    // For recurring tasks, check only assignee
    return recurringTasks.filter(t => String(t.assignee || '').trim() === currentUser.name);
  }, [recurringTasks, currentUser, isAdmin]);

  const visibleRecurringActions = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return recurringActions;
    return recurringActions.filter(a => String(a.assignee || '').trim() === currentUser.name);
  }, [recurringActions, currentUser, isAdmin]);

  const [lastAddedCategory, setLastAddedCategory] = useState<string>('');
  const [lastAddedProject, setLastAddedProject] = useState<string>('');
  const [lastAddedVendorCategory, setLastAddedVendorCategory] = useState<string>('');

  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterProject, setFilterProject] = useState<string[]>([]);
  const [filterClient, setFilterClient] = useState<string[]>([]);
  const [filterOwner, setFilterOwner] = useState<string[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
  const [filterVendor, setFilterVendor] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [lastUpdateFrom, setLastUpdateFrom] = useState('');
  const [lastUpdateTo, setLastUpdateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [logDashboardFilter, setLogDashboardFilter] = useState<{ type: string; value: string; dateFrom?: string; dateTo?: string } | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTaskModalVendorMode, setIsTaskModalVendorMode] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isVendorCategoryModalOpen, setIsVendorCategoryModalOpen] = useState(false);
  const [isDesignationModalOpen, setIsDesignationModalOpen] = useState(false);
  const [isRecurringTaskModalOpen, setIsRecurringTaskModalOpen] = useState(false);
  const [isRecurringTaskUpdateModalOpen, setIsRecurringTaskUpdateModalOpen] = useState(false);
  const [isEditRecurringTaskModalOpen, setIsEditRecurringTaskModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isRecurringHistoryModalOpen, setIsRecurringHistoryModalOpen] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<Task | null>(null);
  const [selectedRecurringTask, setSelectedRecurringTask] = useState<RecurringTask | null>(null);

  const isDashboardNavigation = useRef(false);

  useEffect(() => {
    if (isDashboardNavigation.current) {
        isDashboardNavigation.current = false;
        return;
    }
    setFilterStatus([]);
    setFilterPriority([]);
    setFilterProject([]);
    setFilterClient([]);
    setFilterOwner([]);
    setFilterAssignee([]);
    setFilterVendor([]);
    setFilterCategory([]);
    setDateFrom('');
    setDateTo('');
    setLastUpdateFrom('');
    setLastUpdateTo('');
    setSearchTerm('');
    setLogDashboardFilter(null);
  }, [activeTab]);

  const apiPost = async (action: string, data: any, target?: string) => {
    if (!apiUrl) return { success: false, error: 'No API URL configured' };
    setIsSyncing(true);
    setApiError(null);

    const now = new Date();
    const timestamp = now.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
    const shortDate = now.toLocaleDateString('en-GB');

    const finalData = { ...data };
    
    if (action === 'addTask' || action === 'updateTask') {
        finalData.id = data.id || data.ID || 0;
        finalData.title = data.title || data.Title || data.task || data.taskTitle || data.Task || '';
        finalData.task = finalData.title; 
        finalData.notes = data.remarks || data.Notes || data.remarks || '';
        finalData.assignees = data.assignees || '';
        finalData.owner = data.owner || '';
        finalData.status = data.status || 'Not Yet Started';
        finalData.priority = data.priority || 'Medium';
        finalData.category = data.category || '';
        finalData.vendor = data.vendor || '';
        finalData.vendorCategory = data.vendorCategory || '';
        finalData.hours = Number(data.hours || 0); // Include hours
        
        const projectValue = String(data.project || '');
        const projMatch = projectValue.match(/(.*)\s\((.*)\)/);
        if (projMatch) {
            finalData.project = projMatch[1].trim(); 
            finalData.clientName = projMatch[2].trim(); 
        } else {
            finalData.project = projectValue;
            finalData.clientName = data.clientName || '';
        }
        
        finalData['due Date'] = data.dueDate || '';
        
        if (!data.skipTimestamp) {
            finalData['last Update'] = timestamp;
            finalData.lastUpdateDate = timestamp; 
            finalData['remark'] = data.lastUpdateRemarks || data.remarks || data.Remarks || '';
        }
        
        finalData.taskDate = data.date || shortDate;
        finalData['date'] = data.date || shortDate;
    }

    if (action === 'addMaster' || action === 'updateMaster') {
        finalData.id = data.id || data.ID || 0;
        if (data.taskId) {
            finalData.taskID = data.taskId;
            finalData.recurringTaskId = data.taskId;
        }
        const gst = data.gstNumber || data.GSTNumber || data.gSTNumber || '';
        if (gst) finalData.gSTNumber = gst;
        if ('password' in data) finalData.password = data.password;
    }

    const payload = {
      action: action,
      target: target,
      data: finalData,
      user: currentUser?.name || 'Unknown'
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        mode: 'cors',
        redirect: 'follow'
      });
      const result = await safeJsonParse(response, action);
      if (result.success) setTimeout(() => fetchData(false), 1500);
      return result;
    } catch (err: any) {
      console.error(`API Error:`, err.message);
      setTimeout(() => fetchData(false), 2000);
      return { success: true }; 
    } finally {
      setIsSyncing(false);
    }
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!apiUrl) return;
    if (showLoading) setIsLoading(true);
    else setIsSyncing(true);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch(`${apiUrl}${apiUrl.includes('?') ? '&' : '?'}action=init&_cb=${Date.now()}`, { 
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
        mode: 'cors'
      });
      const result = await safeJsonParse(response, 'Data Load');
      
      if (result.success) {
        const { data } = result;
        const normalizeTasks = (list: any[]) => (list || []).map(item => {
            const rawProject = String(item.project || item.Project || '').trim();
            const rawClient = String(item.clientName || item['client Name'] || item['Client Name'] || item.client || item.Client || '').trim();
            
            return {
                ...item,
                id: Number(item.id || item.ID || 0),
                title: String(item.title || item.Title || item.task || item.taskTitle || item.Task || ''),
                date: formatToIndianDate(item.date || item.Date || ''),
                lastUpdateDate: formatToIndianDateTime(item.lastUpdate || item.lastUpdateDate || item.LastUpdateDate || ''),
                remarks: String(item.notes || item.remarks || item.Remarks || ''),
                lastUpdateRemarks: String(item.remark || item.lastUpdateRemarks || item.lastUpdateRemark || item.LastUpdateRemarks || ''),
                status: String(item.status || item.Status || 'Not Yet Started'),
                priority: String(item.priority || item.Priority || 'Medium'),
                dueDate: formatToIndianDate(item.dueDate || item['due Date'] || item.DueDate || ''),
                vendor: item.vendor ? String(item.vendor) : '',
                category: item.category ? String(item.category) : '',
                vendorCategory: item.vendorCategory || item.vendorcategory || '',
                clientName: rawClient,
                hours: Number(item.hours || 0), // Normalize hours
                project: (rawProject && rawClient && !rawProject.includes('(')) 
                    ? `${rawProject} (${rawClient})` 
                    : rawProject || ''
            };
        });

        setTasks(normalizeTasks([...(data.mainTasks || []), ...(data.vendorTasks || [])]));
        setUsers((data.users || []).map((u: any) => ({ ...u, id: Number(u.id), isActive: String(u.isActive).toUpperCase() === 'TRUE' })));
        setProjects((data.projects || []).map((p: any) => ({ ...p, id: Number(p.id) })));
        setClients((data.clients || []).map((c: any) => ({ ...c, id: Number(c.id), gstNumber: c.gstNumber || c.gSTNumber || c.GSTNumber || '' })));
        setVendors((data.vendors || []).map((v: any) => ({ ...v, id: Number(v.id), gstNumber: v.gstNumber || v.gSTNumber || v.GSTNumber || '' })));
        setCategories((data.categories || []).map((c: any) => ({ ...c, id: Number(c.id) })));
        setVendorCategories((data.vendorCategories || []).map((vc: any) => ({ ...vc, id: Number(vc.id) })));
        setDesignations((data.designations || []).map((d: any) => ({ ...d, id: Number(d.id) })));
        const normalizedLogs = (data.actionLogs || []).map((l: any) => {
            const rawProject = String(l.project || l.Project || '').trim();
            const rawClient = String(l.clientName || l['client Name'] || l['Client Name'] || l.client || l.Client || '').trim();
            return {
                ...l,
                id: Number(l.id || l.ID || 0),
                taskId: Number(l.taskId || l.taskID || 0),
                task: String(l.task || l.taskTitle || l.TaskTitle || l.Task || ''),
                taskDate: formatToIndianDate(l.taskDate || l.TaskDate || ''),
                updateDate: formatToIndianDateTime(l.updateDate || l.UpdateDate || l['update Date'] || l['Update Date'] || ''),
                clientName: rawClient,
                assignees: String(l.assignees || l.Assignees || ''),
                hours: Number(l.hours || 0), // Normalize hours in log
                project: (rawProject && rawClient && !rawProject.includes('(')) 
                    ? `${rawProject} (${rawClient})` 
                    : rawProject || '',
                vendor: l.vendor || l.Vendor || ''
            };
        });
        setActionLogs(normalizedLogs);
        setRecurringTasks((data.recurringTasks || []).map((t: any) => ({
            ...t,
            id: Number(t.id),
            frequencyDays: Number(t.frequencyDays || 30),
            startDate: formatToIndianDate(t.startDate || ''),
            lastUpdatedOn: formatToIndianDate(t.lastUpdatedOn || ''),
            status: String(t.status || 'Not Yet Started') as any
        })));
        setRecurringActions((data.recurringActions || []).map((a: any) => ({
          ...a,
          id: Number(a.id || 0),
          taskId: Number(a.taskId || a.taskID || a.taskid || 0),
          updatedOn: formatToIndianDate(a.updatedOn || a.UpdatedOn || '')
        })));
        if (data.settings) setSettings(data.settings);
        setLastSynced(new Date());
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') console.error("fetchData error:", error);
    } finally {
      if (showLoading) setIsLoading(false);
      setIsSyncing(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (apiUrl && currentUser) {
      fetchData();
      const interval = setInterval(() => fetchData(false), AUTO_SYNC_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [fetchData, apiUrl, currentUser]);

  const handleLogin = async (id: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const fetchWithRetry = async (url: string) => {
          const finalUrl = `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
          const response = await fetch(finalUrl, { mode: 'cors' });
          return await safeJsonParse(response, 'Login');
      };
      let regUrl = `${MASTER_REGISTRY_URL}?workspaceId=${id.toLowerCase()}`;
      let regData = await fetchWithRetry(regUrl);
      let targetUrl = regData.url || regData.BackendURL;
      if (!targetUrl) return { success: false, error: `Workspace ID not found.` };
      const authData = await fetchWithRetry(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=init`);
      const user = authData.data?.users?.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
      if (!user) return { success: false, error: "Incorrect Email or Password." };
      const normalizedUser = { ...user, id: Number(user.id), isActive: true };
      setCurrentUser(normalizedUser);
      setWorkspaceId(id);
      setApiUrl(targetUrl);
      localStorage.setItem('taskpro_user', JSON.stringify(normalizedUser));
      localStorage.setItem('taskpro_workspace_id', id);
      localStorage.setItem('taskpro_api_url', targetUrl);
      setActiveTab('dashboard');
      return { success: true };
    } catch (err) { return { success: false, error: "Connection Error." }; }
    finally { setIsLoading(false); }
  };

  const handleAddTaskOptimistic = async (taskData: any, isVendor: boolean) => {
    const tempId = -Date.now(); 
    const now = new Date();
    const shortDate = now.toLocaleDateString('en-GB');
    const tempTask: Task = {
      ...taskData,
      id: tempId,
      date: shortDate,
      status: 'Not Yet Started',
      lastUpdateDate: '',
      lastUpdateRemarks: '',
      priority: taskData.priority || 'Medium',
      dueDate: formatToIndianDate(taskData.dueDate),
      hours: 0,
    };
    setTasks(prev => [tempTask, ...prev]);
    setSyncingIds(prev => new Set(prev).add(tempId));
    try {
      const targetSheet = isVendor ? 'VendorTasks' : 'MainTasks';
      await apiPost('addTask', taskData, targetSheet);
    } catch (err) {
      setTasks(prev => prev.filter(t => t.id !== tempId));
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  };

  const handleUpdateTaskOptimistic = async (task: Task) => {
    const now = new Date();
    const timestamp = now.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
    // Note: Cumulative hours are calculated by server, UI adds newly logged hours to local optimistic state
    setTasks(prev => prev.map(t => t.id === task.id ? { ...task, lastUpdateDate: timestamp } : t)); 
    setSyncingIds(prev => new Set(prev).add(task.id));
    try {
      const targetSheet = task.vendor && task.vendor.trim() !== '' ? 'VendorTasks' : 'MainTasks';
      await apiPost('updateTask', { ...task, lastUpdateRemarks: task.lastUpdateRemarks || '' }, targetSheet); 
    } catch (err) {
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleEditTaskOptimistic = async (task: Task) => {
    const now = new Date();
    const timestamp = now.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
    setTasks(prev => prev.map(t => t.id === task.id ? { ...task, lastUpdateDate: timestamp } : t)); 
    setSyncingIds(prev => new Set(prev).add(task.id));
    try {
      const targetSheet = task.vendor && task.vendor.trim() !== '' ? 'VendorTasks' : 'MainTasks';
      await apiPost('updateTask', { ...task, skipLog: true }, targetSheet); 
    } catch (err) {
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleDeleteLog = async (logId: number, taskId: number, isVendorLog: boolean) => {
    const targetLogSheet = isVendorLog ? 'VendorTaskActionLog' : 'MainTaskActionLog';
    setActionLogs(prev => prev.filter(l => l.id !== logId));
    apiPost('deleteRecord', { id: logId }, targetLogSheet);
    const remainingLogs = actionLogs.filter(l => l.id !== logId && Number(l.taskId) === Number(taskId));
    const lastLog = remainingLogs[0];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedTask = {
        ...task,
        status: lastLog ? lastLog.status as any : 'Not Yet Started',
        lastUpdateDate: lastLog ? lastLog.updateDate : '',
        lastUpdateRemarks: lastLog ? lastLog.remarks : ''
      };
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      const targetTaskSheet = isVendorLog ? 'VendorTasks' : 'MainTasks';
      apiPost('updateTask', { ...updatedTask, skipLog: true }, targetTaskSheet);
    }
  };

  const handleDashboardFilterChange = (type: string, value: string) => {
    isDashboardNavigation.current = true;
    const today = new Date().toLocaleDateString('en-CA');
    if (type === 'vendor') { setActiveTab('pending-vendor-tasks'); setFilterVendor([value]); }
    else if (type === 'assignee') { setActiveTab('pending'); setFilterAssignee([value]); }
    else if (type === 'project') { setActiveTab('pending'); setFilterProject([value]); }
    else if (type === 'priority') { setActiveTab('pending'); setFilterPriority([value]); }
    else if (type === 'category') { setActiveTab('pending'); setFilterCategory([value]); }
    else if (type === 'status') { 
        if (value === 'Overdue') setActiveTab('pending');
        else if (value === 'Completed') setActiveTab('completed');
        else setActiveTab('all-tasks');
        setFilterStatus([value]);
    }
    else if (type === 'employee-log') { setActiveTab('action-log'); setLogDashboardFilter({ type: 'assignee', value: value, dateFrom: today, dateTo: today }); }
    else if (type === 'vendor-log') { setActiveTab('vendor-action-log'); setLogDashboardFilter({ type: 'vendor', value: value, dateFrom: today, dateTo: today }); }
    else if (type === 'recurring-log') { setActiveTab('recurring-actions'); setLogDashboardFilter({ type: 'assignee', value: value, dateFrom: today, dateTo: today }); }
  };

  const handleInstantAddCategory = async (cat: Omit<Category, 'id'>) => {
    const tempId = Date.now();
    const newCat = { ...cat, id: tempId } as Category;
    setCategories(prev => [...prev, newCat]);
    setLastAddedCategory(cat.name);
    await apiPost('addMaster', cat, 'Categories');
  };

  const handleInstantAddVendorCategory = async (vcat: Omit<VendorCategory, 'id'>) => {
    const tempId = Date.now();
    const newVCat = { ...vcat, id: tempId } as VendorCategory;
    setVendorCategories(prev => [...prev, newVCat]);
    setLastAddedVendorCategory(vcat.name);
    await apiPost('addMaster', vcat, 'VendorCategories');
  };

  const handleInstantAddProject = async (proj: Omit<Project, 'id'>) => {
    const tempId = Date.now();
    const newProj = { ...proj, id: tempId } as Project;
    setProjects(prev => [...prev, newProj]);
    setLastAddedProject(`${proj.name} (${proj.client})`);
    await apiPost('addMaster', proj, 'Projects');
  };

  const handleInstantAddClient = async (client: Omit<Client, 'id'>) => {
    const tempId = Date.now();
    const newClient = { ...client, id: tempId } as Client;
    setClients(prev => [...prev, newClient]);
    await apiPost('addMaster', client, 'Clients');
  };

  const renderContent = () => {
    const handleExportExcel = (tasksToExport: Task[]) => {
      const activeFilters: string[] = [];
      if (filterStatus.length > 0) activeFilters.push(`Status: ${filterStatus.join(',')}`);
      if (filterPriority.length > 0) activeFilters.push(`Priority: ${filterPriority.join(',')}`);
      if (filterProject.length > 0) activeFilters.push(`Project: ${filterProject.length} selected`);
      if (filterCategory.length > 0) activeFilters.push(`Category: ${filterCategory.join(',')}`);
      if (filterAssignee.length > 0) activeFilters.push(`Assignee: ${filterAssignee.join(',')}`);
      if (filterVendor.length > 0) activeFilters.push(`Vendor: ${filterVendor.join(',')}`);
      if (dateFrom || dateTo) activeFilters.push(`Range: ${dateFrom || 'Start'} to ${dateTo || 'End'}`);
      
      const filterRow = activeFilters.length > 0 ? `Filters Applied: ${activeFilters.join(' | ')}` : "No Filters Applied";
      const generatedRow = `Generated on: ${new Date().toLocaleString('en-GB')}`;

      const headers = ['Date', 'Task', 'Notes', 'Assignees', 'Owner', 'Project', 'Client Name', 'Vendor', 'Vendor Category', 'Status', 'Last Update Date', 'Last Update Remark', 'Priority', 'Due Date', 'Hours'];
      
      const csvContent = [
        `"${filterRow}"`,
        `"${generatedRow}"`,
        headers.join(','), 
        ...tasksToExport.map(task => {
          const isNotStarted = task.status === 'Not Yet Started';
          const lastDate = isNotStarted ? '' : (task.lastUpdateDate || '');
          const lastRemark = isNotStarted ? '' : (task.lastUpdateRemarks || '');

          return [
            `"${task.date}"`, 
            `"${(task.title || '').replace(/"/g, '""')}"`, 
            `"${(task.remarks || '').replace(/"/g, '""')}"`, 
            `"${task.assignees}"`, 
            `"${task.owner}"`, 
            `"${task.project.split(' (')[0]}"`, 
            `"${task.clientName || ''}"`, 
            `"${task.vendor || ''}"`, 
            `"${task.vendorCategory || ''}"`, 
            `"${task.status}"`, 
            `"${lastDate}"`, 
            `"${lastRemark.replace(/"/g, '""')}"`, 
            `"${task.priority}"`, 
            `"${task.dueDate}"`,
            `"${task.hours || 0}"`
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a'); 
      link.href = URL.createObjectURL(blob); 
      link.setAttribute('download', `TaskPro_Export_${new Date().toISOString().split('T')[0]}.csv`); 
      link.click();
    };

    const commonTaskProps = {
      users, projects, vendors, categories, syncingIds, vendorCategories, currentUser,
      filterStatus, setFilterStatus, filterPriority, setFilterPriority, 
      filterProject, setFilterProject, filterClient, setFilterClient,
      filterOwner, setFilterOwner, filterAssignee, setFilterAssignee, filterCategory, setFilterCategory,
      dateFrom, setDateFrom, dateTo, setDateTo,
      lastUpdateFrom, setLastUpdateFrom, lastUpdateTo, setLastUpdateTo, searchTerm, setSearchTerm, filterVendor, setFilterVendor,
      lastAddedCategory, lastAddedProject, lastAddedVendorCategory, onClearLastAdded: () => { setLastAddedCategory(''); setLastAddedProject(''); setLastAddedVendorCategory(''); },
      onUpdateTask: handleUpdateTaskOptimistic, onEditTask: handleEditTaskOptimistic,
      onDeleteTask: (id: number, isVendor: boolean) => { setTasks(prev => prev.filter(t => t.id !== id)); apiPost('deleteRecord', { id }, isVendor ? 'VendorTasks' : 'MainTasks'); },
      onViewHistory: (task: Task) => { setSelectedTaskForHistory(task); setIsHistoryModalOpen(true); },
      onAddTask: (isVendor: boolean = false) => { setIsTaskModalVendorMode(isVendor); setIsTaskModalOpen(true); },
      onAddCategory: () => setIsCategoryModalOpen(true), onAddProject: () => setIsProjectModalOpen(true),
      onAddVendorCategory: () => setIsVendorCategoryModalOpen(true), onExportExcel: handleExportExcel,
      onBulkUpdateTask: async (ids: number[], updates: any) => {
          setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, ...updates } : t));
          for (const id of ids) {
              const task = tasks.find(t => t.id === id);
              if (task) {
                  const targetSheet = task.vendor && task.vendor.trim() !== '' ? 'VendorTasks' : 'MainTasks';
                  const finalUpdates = { ...updates };
                  
                  const isMetadataOnly = (updates.priority || updates.category || updates.assignees || updates.vendor) && !updates.status;

                  if (isMetadataOnly) {
                      finalUpdates.skipTimestamp = true;
                      finalUpdates.skipLog = true;
                  } else {
                      if (!finalUpdates.lastUpdateRemarks) {
                          const changedFields = [];
                          if (updates.priority) changedFields.push(`Priority to ${updates.priority}`);
                          if (updates.assignees) changedFields.push(`Reassigned to ${updates.assignees}`);
                          if (updates.status) changedFields.push(`Status to ${updates.status}`);
                          if (updates.category) changedFields.push(`Category to ${updates.category}`);
                          finalUpdates.lastUpdateRemarks = `Bulk update: ${changedFields.join(', ')}`;
                      }
                      if ((updates.priority || updates.assignees || updates.vendor || updates.category) && !updates.status) { 
                          finalUpdates.skipLog = true; 
                      }
                  }
                  await apiPost('updateTask', { ...task, ...finalUpdates }, targetSheet);
              }
          }
      }
    };

    switch (activeTab) {
      case 'dashboard': 
        return <Dashboard 
          isAdmin={isAdmin} tasks={visibleTasks} users={users} projects={projects} categories={categories} actionLogs={visibleActionLogs} recurringActions={visibleRecurringActions}
          onNavigate={setActiveTab} onFilterChange={handleDashboardFilterChange} onOpenNewTask={() => { setIsTaskModalVendorMode(false); setIsTaskModalOpen(true); }} 
          onOpenAddUser={() => setIsUserModalOpen(true)} onOpenAddProject={() => setIsProjectModalOpen(true)} onOpenAddClient={() => setIsClientModalOpen(true)} onOpenAddVendor={() => setIsVendorModalOpen(true)} 
        />;
      case 'all-tasks': return <TasksView title="All Tasks" description="View and manage all your tasks" tasks={visibleTasks.filter(t => !t.vendor || t.vendor === '')} {...commonTaskProps} filterType="all" />;
      case 'pending': return <TasksView title="Pending Tasks" description="Tasks requiring attention" tasks={visibleTasks.filter(t => !t.vendor || t.vendor === '')} {...commonTaskProps} filterType="pending" />;
      case 'completed': return <TasksView title="Completed Tasks" description="History of finished tasks" tasks={visibleTasks.filter(t => !t.vendor || t.vendor === '')} {...commonTaskProps} filterType="completed" />;
      case 'update-multiple': return <UpdateMultipleView projects={projects} tasks={visibleTasks.filter(t => t.status !== 'Completed')} onUpdateTasks={async (updates) => { for (const u of updates) await handleUpdateTaskOptimistic(u); setActiveTab('pending'); }} />;
      case 'activity-dashboard': return <ActivityDashboardView logs={visibleActionLogs.filter(l => !l.vendor || l.vendor === '')} users={users} currentUser={currentUser} />;
      case 'action-log': return <ActionLogView logs={visibleActionLogs.filter(l => !l.vendor || l.vendor === '')} projects={projects} onDeleteLog={(logId, taskId) => handleDeleteLog(logId, taskId, false)} dashboardFilter={logDashboardFilter} onClearDashboardFilter={() => setLogDashboardFilter(null)} />;
      case 'vendors': if (!isAdmin) return null; return <VendorsView vendors={vendors} onAddVendor={(v) => { setVendors(p => [...p, { ...v, id: Date.now() } as any]); apiPost('addMaster', v, 'Vendors'); }} onDeleteVendor={(id) => { setVendors(p => p.filter(v => v.id !== id)); apiPost('deleteRecord', { id }, 'Vendors'); }} onEditVendor={(v) => { setVendors(p => p.map(x => x.id === v.id ? v : x)); apiPost('updateMaster', v, 'Vendors'); }} />;
      case 'vendor-categories': if (!isAdmin) return null; return <VendorCategoriesView categories={vendorCategories} onAddCategory={() => setIsVendorCategoryModalOpen(true)} onDeleteCategory={(id) => { setVendorCategories(p => p.filter(c => c.id !== id)); apiPost('deleteRecord', { id }, 'VendorCategories'); }} onEditCategory={(vc) => { setVendorCategories(p => p.map(x => x.id === vc.id ? vc : x)); apiPost('updateMaster', vc, 'VendorCategories'); }} />;
      case 'vendor-tasks': return <TasksView title="All Vendor Tasks" description="Manage external vendor activities" tasks={visibleTasks.filter(t => t.vendor && t.vendor !== '')} {...commonTaskProps} isVendorView={true} filterType="all" />;
      case 'pending-vendor-tasks': return <TasksView title="Pending Vendor Tasks" description="Active vendor activities" tasks={visibleTasks.filter(t => t.vendor && t.vendor !== '')} {...commonTaskProps} isVendorView={true} filterType="pending" />;
      case 'completed-vendor-tasks': return <TasksView title="Completed Vendor Tasks" description="Finished vendor activities" tasks={visibleTasks.filter(t => t.vendor && t.vendor !== '')} {...commonTaskProps} isVendorView={true} filterType="completed" />;
      case 'vendor-action-log': return <ActionLogView logs={visibleActionLogs.filter(l => l.vendor && l.vendor !== '')} projects={projects} isVendorView={true} onDeleteLog={(logId, taskId) => handleDeleteLog(logId, taskId, true)} dashboardFilter={logDashboardFilter} onClearDashboardFilter={() => setLogDashboardFilter(null)} />;
      case 'due-recurring-tasks': return <RecurringTasksView title="Due Recurring Tasks" filterType="due" tasks={visibleRecurringTasks} actions={visibleRecurringActions} onAdd={() => setIsRecurringTaskModalOpen(true)} onUpdate={(t) => { setSelectedRecurringTask(t); setIsRecurringTaskUpdateModalOpen(true); }} onEdit={(t) => { setSelectedRecurringTask(t); setIsEditRecurringTaskModalOpen(true); }} onViewHistory={(t) => { setSelectedRecurringTask(t); setIsRecurringHistoryModalOpen(true); }} onDelete={(id) => { setRecurringTasks(prev => prev.filter(t => t.id !== id)); apiPost('deleteRecord', { id }, 'RecurringTasks'); }} currentUser={currentUser} />;
      case 'recurring-tasks': return <RecurringTasksView title="Recurring Tasks" tasks={visibleRecurringTasks} actions={visibleRecurringActions} onAdd={() => setIsRecurringTaskModalOpen(true)} onUpdate={(t) => { setSelectedRecurringTask(t); setIsRecurringTaskUpdateModalOpen(true); }} onEdit={(t) => { setSelectedRecurringTask(t); setIsEditRecurringTaskModalOpen(true); }} onViewHistory={(t) => { setSelectedRecurringTask(t); setIsRecurringHistoryModalOpen(true); }} onDelete={(id) => { setRecurringTasks(prev => prev.filter(t => t.id !== id)); apiPost('deleteRecord', { id }, 'RecurringTasks'); }} currentUser={currentUser} />;
      case 'recurring-actions': return <RecurringTaskActionsView actions={visibleRecurringActions} onDeleteAction={(logId, taskId) => apiPost('deleteRecord', { id: logId, taskId: taskId }, 'RecurringActions')} dashboardFilter={logDashboardFilter} onClearDashboardFilter={() => setLogDashboardFilter(null)} />;
      case 'users': if (!isAdmin) return null; return <UsersView users={users} designations={designations} onAddUser={(u) => { setUsers(p => [...p, { ...u, id: Date.now(), isActive: true } as any]); apiPost('addMaster', u, 'Users'); }} onEditUser={(u) => { setUsers(p => p.map(x => x.id === u.id ? u : x)); apiPost('updateMaster', u, 'Users'); }} onToggleStatus={(id) => { const user = users.find(u => u.id === id); if (!user) return; const newStatus = !user.isActive; setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: newStatus } : u)); apiPost('updateMaster', { id, isActive: newStatus ? 'TRUE' : 'FALSE' }, 'Users'); }} onDeleteUser={(id) => { setUsers(p => p.filter(u => u.id !== id)); apiPost('deleteRecord', { id }, 'Users'); }} onAddDesignation={() => setIsDesignationModalOpen(true)} />;
      case 'clients': if (!isAdmin) return null; return <ClientsView clients={clients} projects={projects} onAddClient={handleInstantAddClient} onDeleteClient={(id) => { setClients(p => p.filter(c => c.id !== id)); apiPost('deleteRecord', { id }, 'Clients'); }} onEditClient={(c) => { setClients(p => p.map(x => x.id === c.id ? c : x)); apiPost('updateMaster', c, 'Clients'); }} onNavigateToProjectTasks={handleDashboardFilterChange.bind(null, 'project')} />;
      case 'projects': if (!isAdmin) return null; return <ProjectsView projects={projects} clients={clients} onAddProject={handleInstantAddProject} onDeleteProject={(id) => { setProjects(p => p.filter(x => x.id !== id)); apiPost('deleteRecord', { id }, 'Projects'); }} onEditProject={(p) => { setProjects(prev => prev.map(x => x.id === p.id ? p : x)); apiPost('updateMaster', p, 'Projects'); }} onAddClient={() => setIsClientModalOpen(true)} onNavigateToProjectTasks={handleDashboardFilterChange.bind(null, 'project')} />;
      case 'categories': if (!isAdmin) return null; return <CategoriesView categories={categories} onAddCategory={() => setIsCategoryModalOpen(true)} onDeleteCategory={(id) => { setCategories(p => p.filter(c => c.id !== id)); apiPost('deleteRecord', { id }, 'Categories'); }} onEditCategory={(c) => { setCategories(p => p.map(x => x.id === c.id ? c : x)); apiPost('updateMaster', c, 'Categories'); }} />;
      case 'settings': if (!isAdmin) return null; return <SettingsView settings={settings} onUpdate={(s) => { setSettings(s); apiPost('updateMaster', s, 'AppSettings'); }} />;
      case 'telegram-setup': if (!isAdmin) return null; return <TelegramSetupView />;
      default: return null;
    }
  };

  const handleLayoutChange = (mode: 'side' | 'top') => { setLayoutMode(mode); localStorage.setItem('taskpro_layout', mode); };

  if (!currentUser) return <LoginView onLogin={handleLogin} isAuthenticating={isLoading} savedWorkspaceId={workspaceId} />;

  return (
    <div className={`flex h-screen bg-gray-50 overflow-hidden flex-col ${layoutMode === 'side' ? 'md:flex-row' : 'md:flex-col'}`}>
      {layoutMode === 'side' ? (
        <Sidebar items={filteredNavItems} activeTab={activeTab} onTabChange={setActiveTab} onLayoutChange={handleLayoutChange} layoutMode={layoutMode} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} lastSynced={lastSynced} isSyncing={isSyncing} onSync={fetchData} onLogout={() => { setCurrentUser(null); localStorage.removeItem('taskpro_user'); }} onExitWorkspace={() => { setCurrentUser(null); localStorage.clear(); }} workspaceId={workspaceId} />
      ) : (
        <TopBar items={filteredNavItems} activeTab={activeTab} onTabChange={setActiveTab} onLayoutChange={handleLayoutChange} layoutMode={layoutMode} lastSynced={lastSynced} isSyncing={isSyncing} onSync={fetchData} />
      )}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {layoutMode === 'side' && (
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-blue-200 z-20">
            <div className="flex items-center space-x-2"><img src="https://i.ibb.co/YBSjM7Gg/Chat-GPT-Image-Dec-18-2025-10-23-18-AM.png" className="h-8 w-8" alt="Logo" /><h1 className="text-lg font-bold text-blue-600">TaskPro</h1></div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-blue-600"><Menu size={24} /></button>
          </header>
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col w-full">
          <div className="flex-1">{renderContent()}</div>
          <Footer />
        </main>
      </div>

      <AddTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSave={(t) => handleAddTaskOptimistic(t, isTaskModalVendorMode)} isVendorView={isTaskModalVendorMode} users={users} categories={categories} projects={projects} vendors={vendors} vendorCategories={vendorCategories} onAddCategory={() => setIsCategoryModalOpen(true)} onAddProject={() => setIsProjectModalOpen(true)} onAddVendorCategory={() => setIsVendorCategoryModalOpen(true)} lastAddedCategory={lastAddedCategory} lastAddedProject={lastAddedProject} lastAddedVendorCategory={lastAddedVendorCategory} onClearLastAdded={() => { setLastAddedCategory(''); setLastAddedProject(''); setLastAddedVendorCategory(''); }} />
      <AddCategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} onSave={handleInstantAddCategory} categories={categories} />
      <AddVendorCategoryModal isOpen={isVendorCategoryModalOpen} onClose={() => setIsVendorCategoryModalOpen(false)} onSave={handleInstantAddVendorCategory} vendorCategories={vendorCategories} />
      <AddProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} onSave={handleInstantAddProject} clients={clients} onAddClient={() => setIsClientModalOpen(true)} />
      <AddUserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={(u) => apiPost('addMaster', u, 'Users')} designations={designations} onAddDesignation={() => setIsDesignationModalOpen(true)} users={users} />
      <AddClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSave={handleInstantAddClient} clients={clients} />
      <AddVendorModal isOpen={isVendorModalOpen} onClose={() => setIsVendorModalOpen(false)} onSave={(v) => apiPost('addMaster', v, 'Vendors')} vendors={vendors} />
      <AddDesignationModal isOpen={isDesignationModalOpen} onClose={() => setIsDesignationModalOpen(false)} onSave={(d) => apiPost('addMaster', d, 'Designations')} designations={designations} />
      <AddRecurringTaskModal isOpen={isRecurringTaskModalOpen} onClose={() => setIsRecurringTaskModalOpen(false)} onSave={(t) => { const tempId = -Date.now(); const newTask: RecurringTask = { ...t, id: tempId, status: 'Not Yet Started', lastUpdatedOn: '', lastUpdateRemarks: '' }; setRecurringTasks(p => [newTask, ...p]); apiPost('addMaster', t, 'RecurringTasks'); }} users={users} categories={categories} />
      <EditRecurringTaskModal isOpen={isEditRecurringTaskModalOpen} onClose={() => setIsEditRecurringTaskModalOpen(false)} task={selectedRecurringTask} onSave={(data) => { setRecurringTasks(p => p.map(t => t.id === data.id ? data : t)); apiPost('updateMaster', data, 'RecurringTasks'); }} users={users} categories={categories} />
      <UpdateRecurringTaskModal isOpen={isRecurringTaskUpdateModalOpen} onClose={() => setIsRecurringTaskUpdateModalOpen(false)} task={selectedRecurringTask} onSave={async (updatedTask) => { const now = new Date(); const nowStr = now.toLocaleDateString('en-GB'); const timestampStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }); const shouldShiftAnchor = updatedTask.status === 'Complete'; const newAnchorDate = shouldShiftAnchor ? nowStr : (selectedRecurringTask?.lastUpdatedOn || selectedRecurringTask?.startDate || ''); setRecurringTasks(p => p.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask, lastUpdatedOn: newAnchorDate } : t)); const newAction: RecurringTaskAction = { id: -Date.now(), taskId: updatedTask.id, taskTitle: updatedTask.title, category: updatedTask.category, assignee: updatedTask.assignee, status: updatedTask.status, remarks: updatedTask.lastUpdateRemarks || '', updatedOn: nowStr, timestamp: timestampStr }; setRecurringActions(p => [newAction, ...p]); await apiPost('updateMaster', { ...updatedTask, lastUpdatedOn: newAnchorDate }, 'RecurringTasks'); await apiPost('addMaster', { ...newAction, taskId: updatedTask.id }, 'RecurringActions'); }} />
      <TaskHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} task={selectedTaskForHistory} logs={actionLogs} />
      <RecurringTaskHistoryModal isOpen={isRecurringHistoryModalOpen} onClose={() => setIsRecurringHistoryModalOpen(false)} task={selectedRecurringTask} actions={recurringActions} />
      
      {apiError && (
        <div className="fixed bottom-4 right-4 z-50">
           <div className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-2 border-red-400">
             <AlertCircle size={24} /><p className="text-xs font-bold uppercase tracking-widest">{apiError}</p><button onClick={() => setApiError(null)}><X size={18} /></button>
           </div>
        </div>
      )}
    </div>
  );
}
