import { createContext } from 'react';
import type {
  ActivityStatus,
  Campaign,
  DashboardSection,
  DashboardTab,
  EmailRow,
  EmailSortOrder,
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
  selectedEmail: EmailRow | null;
  search: string;
  searchRefreshVersion: number;
  searchResult: { query: string; rows: EmailRow[] } | null;
  searchLoading: boolean;
  statusFilter: string;
  senderFilter: string;
  sortOrder: EmailSortOrder;
  loading: boolean;
  activityStatus: ActivityStatus;
  showCompose: boolean;
  showSenders: boolean;
  showCommandPalette: boolean;
  showMobileNav: boolean;
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
  showAnalytics: () => void;
  showCampaign: (campaignId: number) => void;
  setSelectedEmail: (row: EmailRow | null) => void;
  setSearch: (query: string) => void;
  clearSearch: () => void;
  setStatusFilter: (status: string) => void;
  setSenderFilter: (senderId: string) => void;
  setSortOrder: (order: EmailSortOrder) => void;
  setShowCompose: (open: boolean) => void;
  setShowSenders: (open: boolean) => void;
  setShowCommandPalette: (open: boolean) => void;
  setShowMobileNav: (open: boolean) => void;
  setMessage: (message: string) => void;
  setError: (error: string) => void;
  resetDashboard: () => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);
