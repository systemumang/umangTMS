
import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  onClick?: () => void;
}

export interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  colorClass: string;
  onClick?: () => void;
}

export interface TableRow {
  name: string;
  total: number;
  notStarted: number;
  inProgress: number;
}

export interface Task {
  id: number;
  title: string;
  assignees: string;
  owner: string;
  project: string;
  clientName?: string; 
  category?: string;
  vendor?: string; 
  vendorCategory?: string; 
  status: 'Completed' | 'Not Yet Started' | 'In Progress' | 'Started';
  priority: 'Medium' | 'High' | 'Low';
  dueDate: string;
  date: string; 
  remarks?: string; 
  lastUpdateDate?: string;
  lastUpdateRemarks?: string;
  hours?: number;
}

export interface RecurringTask {
  id: number;
  title: string;
  category: string;
  assignee: string;
  frequencyDays: number;
  startDate: string;
  lastUpdatedOn?: string;
  lastUpdateRemarks?: string;
  status?: 'Not Yet Started' | 'In Progress' | 'Complete';
  periodicity?: 'Fixed Days' | 'Weekly' | 'Monthly' | 'Yearly';
  recurrenceDay?: number; // 0-6 for Weekly, 1-31 for Monthly/Yearly
  recurrenceMonth?: string; // Month name for Yearly
}

export interface RecurringTaskAction {
  id: number;
  taskId: number;
  taskTitle: string;
  category: string;
  assignee: string;
  status: 'Not Yet Started' | 'In Progress' | 'Complete';
  updatedOn: string; 
  timestamp: string; 
  remarks: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  designation: string;
  role: string;
  isActive: boolean;
  telegramUserName?: string;
  password?: string; 
}

export interface Designation {
    id: number;
    title: string;
    description: string;
}

export interface Category {
    id: number;
    name: string;
    type: string;
}

export interface VendorCategory {
    id: number;
    name: string;
}

export interface Client {
    id: number;
    name: string;
    email: string;
    mobile: string;
    address: string;
    gstNumber?: string;
}

export interface Vendor {
    id: number;
    name: string;
    email: string;
    mobile: string;
    address: string;
    gstNumber?: string;
}

export interface Project {
    id: number;
    name: string;
    client: string;
    status: string;
    telegramGroupId?: string;
    whatsappGroupId?: string;
    projectEmail?: string;
}

export interface ActionLogEntry {
    id: number;
    taskId: number;
    task: string;
    taskDate: string;
    updateDate: string;
    status: string;
    remarks: string;
    owner: string;
    assignees: string;
    project: string;
    clientName?: string; 
    vendor?: string;
    hours?: number;
}

export interface AppSettings {
  officeTokenId: string;
  officeTelegramGroupId: string;
  whatsappGroupId: string;
  masId: string;
  masPassword: string;
  metaAccessToken: string;
  metaPhoneNumberId: string;
  metaWabaId: string;
  metaVerifyToken: string;
}
