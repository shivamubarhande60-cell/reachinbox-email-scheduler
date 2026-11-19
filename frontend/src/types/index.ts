export interface User {
  id: number;
  name: string;
  email: string;
  picture: string | null;
  isDemo: boolean;
  simulatedDelivery: boolean;
  slackConnected: boolean;
  slackConfigured: boolean;
}

export interface Lead {
  id: number;
  email: string;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt?: string;
}

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  body?: string;
  status?: string;
  senderId: string;
  startAt?: string;
  delayMs?: number;
  hourlyLimit?: number | null;
  createdAt: string;
  leads: Lead[];
}

export interface Sender {
  id: string;
  name: string;
  from: string;
  maxEmailsPerHour: number;
  minimumDelayMs: number;
  managed: boolean;
  simulated: boolean;
}

export type EmailRow = Lead &
  Pick<Campaign, 'subject' | 'name' | 'senderId' | 'body' | 'delayMs' | 'hourlyLimit'>;

export type DashboardTab = 'scheduled' | 'sent';
export type DashboardSection = 'activity' | 'campaigns' | 'campaign' | 'attention' | 'analytics';
export type ActivityStatus = 'connecting' | 'live' | 'offline';

export type ThemeMode = 'light' | 'dark';

export type EmailSortOrder = 'newest' | 'oldest';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'error' | 'info';
}
