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
}

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  senderId: string;
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

export type EmailRow = Lead & Pick<Campaign, 'subject' | 'name' | 'senderId'>;

export type DashboardTab = 'scheduled' | 'sent';
export type DashboardSection = 'activity' | 'campaigns' | 'campaign' | 'attention';
export type ActivityStatus = 'connecting' | 'live' | 'offline';
