import { createContext } from 'react';
import type {
  ActivityStatus,
  Campaign,
  DashboardSection,
  DashboardTab,
  EmailRow,
  Sender,
} from '../types';

export interface DashboardState {
  campaigns: Campaign[];
  senders: Sender[];
  maxHourlyLimit: number;
  minimumDelayMs: number;
  activeTab: DashboardTab;
  dashboardSection: DashboardSection;
  selectedCampaignId: number | null;
  search: string;
  searchRefreshVersion: number;
  searchResult: { query: string; rows: EmailRow[] } | null;
  searchLoading: boolean;
  loading: boolean;
  activityStatus: ActivityStatus;
  showCompose: boolean;
  showSenders: boolean;
  message: string;
  error: string;
}

export interface DashboardContextValue extends DashboardState {
  rows: EmailRow[];
  scheduledRows: EmailRow[];
  sentRows: EmailRow[];
  deliveredCount: number;
  failedCount: number;
  selectedCampaign: Campaign | null;
  visibleRows: EmailRow[];
  loadDashboard: (quiet?: boolean, announceRefresh?: boolean) => Promise<void>;
  refreshAll: () => void;
  setActiveTab: (tab: DashboardTab) => void;
  showActivity: (tab: DashboardTab) => void;
  showCampaigns: () => void;
  showAttention: () => void;
  showCampaign: (campaignId: number) => void;
  setSearch: (query: string) => void;
  clearSearch: () => void;
  setShowCompose: (open: boolean) => void;
  setShowSenders: (open: boolean) => void;
  setMessage: (message: string) => void;
  setError: (error: string) => void;
  resetDashboard: () => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);
