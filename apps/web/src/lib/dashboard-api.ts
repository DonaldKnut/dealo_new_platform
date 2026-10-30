import { apiFetch } from '@/lib/api';

export type DashboardOverview = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
  stats: {
    totalRequests: number;
    openRequests: number;
    inProgress: number;
    converted: number;
  };
  recentRequests: Array<{
    id: string;
    companyName: string;
    roleTitle: string;
    serviceType: string;
    status: string;
    numberOfProfessionals: number;
    createdAt: string;
  }>;
};

export type DashboardRequest = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  roleTitle: string;
  serviceType: string;
  status: string;
  numberOfProfessionals: number;
  location: string;
  createdAt: string;
};

export function fetchDashboardOverview() {
  return apiFetch<DashboardOverview>('/dashboard/overview');
}

export function fetchDashboardRequests() {
  return apiFetch<DashboardRequest[]>('/dashboard/requests');
}

export function fetchAuthMe() {
  return apiFetch<DashboardOverview['user']>('/auth/me');
}
