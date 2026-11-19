import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { ApiError, getErrorMessage } from '../services/apiClient';
import { campaignApi } from '../services/campaignApi';
import { senderApi } from '../services/senderApi';
import type { Campaign, DashboardTab, EmailRow, EmailSortOrder, Sender } from '../types';
import { DashboardContext, type DashboardState } from './dashboardContextDef';
import { useAuth } from './useAuth';

type DashboardAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | {
      type: 'LOAD_SUCCESS';
      campaigns: Campaign[];
      senders: Sender[];
      maxHourlyLimit: number;
      minimumDelayMs: number;
      announceRefresh: boolean;
    }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'SET_TAB'; tab: DashboardTab }
  | { type: 'SHOW_ACTIVITY'; tab: DashboardTab }
  | { type: 'SHOW_CAMPAIGNS' }
  | { type: 'SHOW_ATTENTION' }
  | { type: 'SHOW_ANALYTICS' }
  | { type: 'SHOW_CAMPAIGN'; campaignId: number }
  | { type: 'SET_SELECTED_EMAIL'; row: EmailRow | null }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'REFRESH_SEARCH' }
  | { type: 'SEARCH_SUCCESS'; query: string; rows: EmailRow[] }
  | { type: 'SEARCH_DONE' }
  | { type: 'SET_STATUS_FILTER'; status: string }
  | { type: 'SET_SENDER_FILTER'; senderId: string }
  | { type: 'SET_SORT_ORDER'; order: EmailSortOrder }
  | { type: 'SET_SHOW_COMPOSE'; open: boolean }
  | { type: 'SET_SHOW_SENDERS'; open: boolean }
  | { type: 'SET_SHOW_COMMAND_PALETTE'; open: boolean }
  | { type: 'SET_SHOW_MOBILE_NAV'; open: boolean }
  | { type: 'SET_MESSAGE'; message: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

function createInitialState(): DashboardState {
  const hasSlackConnectedParam =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('slack') === 'connected';

  return {
    campaigns: [],
    senders: [],
    maxHourlyLimit: 200,
    minimumDelayMs: 2000,
    activeTab: 'scheduled',
    dashboardSection: 'activity',
    selectedCampaignId: null,
    selectedEmail: null,
    search: '',
    searchRefreshVersion: 0,
    searchResult: null,
    searchLoading: false,
    statusFilter: 'ALL',
    senderFilter: 'ALL',
    sortOrder: 'newest',
    loading: false,
    activityStatus: 'connecting',
    showCompose: false,
    showSenders: false,
    showCommandPalette: false,
    showMobileNav: false,
    message: hasSlackConnectedParam
      ? 'Slack is connected. Rate-limit alerts will be sent to your account.'
      : '',
    error: '',
  };
}

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        campaigns: action.campaigns,
        senders: action.senders,
        maxHourlyLimit: action.maxHourlyLimit,
        minimumDelayMs: action.minimumDelayMs,
        activityStatus: 'live',
        error: '',
        message: action.announceRefresh ? 'Email list refreshed.' : state.message,
      };
    case 'LOAD_ERROR':
      return {
        ...state,
        activityStatus: 'offline',
        error: action.message,
      };
    case 'SET_TAB':
      return {
        ...state,
        dashboardSection: 'activity',
        selectedCampaignId: null,
        activeTab: action.tab,
        statusFilter: 'ALL',
        senderFilter: 'ALL',
      };
    case 'SHOW_ACTIVITY':
      return {
        ...state,
        dashboardSection: 'activity',
        selectedCampaignId: null,
        activeTab: action.tab,
        search: '',
        searchRefreshVersion: 0,
        searchResult: null,
        searchLoading: false,
        statusFilter: 'ALL',
        senderFilter: 'ALL',
      };
    case 'SHOW_CAMPAIGNS':
      return {
        ...state,
        dashboardSection: 'campaigns',
        selectedCampaignId: null,
        search: '',
        searchRefreshVersion: 0,
        searchResult: null,
        searchLoading: false,
        statusFilter: 'ALL',
        senderFilter: 'ALL',
      };
    case 'SHOW_ATTENTION':
      return {
        ...state,
        dashboardSection: 'attention',
        selectedCampaignId: null,
        activeTab: 'sent',
        search: '',
        searchRefreshVersion: 0,
        searchResult: null,
        searchLoading: false,
        statusFilter: 'ALL',
        senderFilter: 'ALL',
      };
    case 'SHOW_ANALYTICS':
      return {
        ...state,
        dashboardSection: 'analytics',
        selectedCampaignId: null,
        search: '',
        searchRefreshVersion: 0,
        searchResult: null,
        searchLoading: false,
        statusFilter: 'ALL',
        senderFilter: 'ALL',
      };
    case 'SHOW_CAMPAIGN':
      return {
        ...state,
        dashboardSection: 'campaign',
        selectedCampaignId: action.campaignId,
        search: '',
        searchRefreshVersion: 0,
        searchResult: null,
        searchLoading: false,
        statusFilter: 'ALL',
        senderFilter: 'ALL',
      };
    case 'SET_SELECTED_EMAIL':
      return { ...state, selectedEmail: action.row };
    case 'SET_SEARCH':
      return {
        ...state,
        dashboardSection: 'activity',
        selectedCampaignId: null,
        search: action.query,
        searchResult: null,
        searchLoading: Boolean(action.query.trim()),
      };
    case 'CLEAR_SEARCH':
      return {
        ...state,
        search: '',
        searchRefreshVersion: 0,
        searchResult: null,
        searchLoading: false,
      };
    case 'REFRESH_SEARCH':
      return {
        ...state,
        searchResult: null,
        searchLoading: true,
        searchRefreshVersion: state.searchRefreshVersion + 1,
      };
    case 'SEARCH_SUCCESS':
      return {
        ...state,
        searchResult: { query: action.query, rows: action.rows },
      };
    case 'SEARCH_DONE':
      return { ...state, searchLoading: false };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.status };
    case 'SET_SENDER_FILTER':
      return { ...state, senderFilter: action.senderId };
    case 'SET_SORT_ORDER':
      return { ...state, sortOrder: action.order };
    case 'SET_SHOW_COMPOSE':
      return { ...state, showCompose: action.open };
    case 'SET_SHOW_SENDERS':
      return { ...state, showSenders: action.open };
    case 'SET_SHOW_COMMAND_PALETTE':
      return { ...state, showCommandPalette: action.open };
    case 'SET_SHOW_MOBILE_NAV':
      return { ...state, showMobileNav: action.open };
    case 'SET_MESSAGE':
      return { ...state, message: action.message };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET':
      return createInitialState();
    default:
      return state;
  }
}

function getRowTimestamp(row: EmailRow): number {
  const dateStr = row.sentAt || row.scheduledAt || row.createdAt;
  if (!dateStr) return row.id;
  const ms = new Date(dateStr).getTime();
  return Number.isNaN(ms) ? row.id : ms;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { user, clearUser, loadUser } = useAuth();
  const [state, dispatch] = useReducer(dashboardReducer, undefined, createInitialState);

  const loadDashboard = useCallback(
    async (quiet = false, announceRefresh = false) => {
      if (!quiet) dispatch({ type: 'SET_LOADING', loading: true });
      try {
        const [campaignResult, senderResult] = await Promise.all([
          campaignApi.listCampaigns(),
          senderApi.listSenders(),
        ]);
        dispatch({
          type: 'LOAD_SUCCESS',
          campaigns: campaignResult.data || [],
          senders: senderResult.data || [],
          maxHourlyLimit: senderResult.maxEmailsPerHour || 200,
          minimumDelayMs: senderResult.minimumDelayMs || 2000,
          announceRefresh,
        });
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 401) {
          clearUser();
          return;
        }
        dispatch({
          type: 'LOAD_ERROR',
          message: getErrorMessage(cause, 'Could not load your emails.'),
        });
      } finally {
        if (!quiet) dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [clearUser],
  );

  useEffect(() => {
    if (!user) return;
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(true), 5000);
    return () => window.clearInterval(timer);
  }, [user, loadDashboard]);

  useEffect(() => {
    const query = state.search.trim();
    if (!user || !query) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await campaignApi.searchEmails(query, controller.signal);
        dispatch({ type: 'SEARCH_SUCCESS', query, rows: result.data || [] });
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        dispatch({ type: 'SET_ERROR', error: getErrorMessage(cause, 'Search failed.') });
      } finally {
        if (!controller.signal.aborted) dispatch({ type: 'SEARCH_DONE' });
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [user, state.search, state.searchRefreshVersion]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('slack') === 'connected') {
      void loadUser();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadUser]);

  const rows = useMemo<EmailRow[]>(
    () =>
      state.campaigns.flatMap((campaign) =>
        campaign.leads.map((lead) => ({
          ...lead,
          subject: campaign.subject,
          name: campaign.name,
          senderId: campaign.senderId,
          body: campaign.body,
          delayMs: campaign.delayMs,
          hourlyLimit: campaign.hourlyLimit,
        })),
      ),
    [state.campaigns],
  );

  const scheduledRows = useMemo(
    () => rows.filter((row) => row.status === 'PENDING' || row.status === 'THROTTLED_DELAYED'),
    [rows],
  );

  const sentRows = useMemo(
    () =>
      rows.filter(
        (row) => row.status === 'SENT' || row.status === 'SIMULATED' || row.status === 'FAILED',
      ),
    [rows],
  );

  const deliveredCount = useMemo(
    () => sentRows.filter((row) => row.status === 'SENT').length,
    [sentRows],
  );

  const failedCount = useMemo(
    () => sentRows.filter((row) => row.status === 'FAILED').length,
    [sentRows],
  );

  const selectedCampaign = useMemo(
    () => state.campaigns.find((campaign) => campaign.id === state.selectedCampaignId) || null,
    [state.campaigns, state.selectedCampaignId],
  );

  const visibleRows = useMemo(() => {
    let baseRows: EmailRow[];
    if (state.dashboardSection === 'attention') {
      baseRows = rows.filter((row) => row.status === 'FAILED');
    } else if (state.dashboardSection === 'campaign') {
      baseRows =
        selectedCampaign?.leads.map((lead) => ({
          ...lead,
          subject: selectedCampaign.subject,
          name: selectedCampaign.name,
          senderId: selectedCampaign.senderId,
          body: selectedCampaign.body,
          delayMs: selectedCampaign.delayMs,
          hourlyLimit: selectedCampaign.hourlyLimit,
        })) || [];
    } else {
      const trimmedSearch = state.search.trim();
      if (trimmedSearch && state.searchResult?.query === trimmedSearch) {
        baseRows = state.searchResult.rows;
      } else if (trimmedSearch) {
        baseRows = [];
      } else {
        baseRows = state.activeTab === 'scheduled' ? scheduledRows : sentRows;
      }
    }

    const filtered = baseRows.filter((row) => {
      if (state.statusFilter !== 'ALL' && row.status !== state.statusFilter) return false;
      if (state.senderFilter !== 'ALL' && row.senderId !== state.senderFilter) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const diff = getRowTimestamp(a) - getRowTimestamp(b);
      return state.sortOrder === 'newest' ? -diff : diff;
    });
  }, [
    state.dashboardSection,
    state.search,
    state.searchResult,
    state.activeTab,
    state.statusFilter,
    state.senderFilter,
    state.sortOrder,
    rows,
    selectedCampaign,
    scheduledRows,
    sentRows,
  ]);

  const refreshAll = useCallback(() => {
    void loadDashboard(false, true);
    if (state.search.trim()) {
      dispatch({ type: 'REFRESH_SEARCH' });
    }
  }, [loadDashboard, state.search]);

  return (
    <DashboardContext.Provider
      value={{
        ...state,
        rows,
        scheduledRows,
        sentRows,
        deliveredCount,
        failedCount,
        selectedCampaign,
        visibleRows,
        loadDashboard,
        refreshAll,
        setActiveTab: (tab) => dispatch({ type: 'SET_TAB', tab }),
        showActivity: (tab) => dispatch({ type: 'SHOW_ACTIVITY', tab }),
        showCampaigns: () => dispatch({ type: 'SHOW_CAMPAIGNS' }),
        showAttention: () => dispatch({ type: 'SHOW_ATTENTION' }),
        showAnalytics: () => dispatch({ type: 'SHOW_ANALYTICS' }),
        showCampaign: (campaignId) => dispatch({ type: 'SHOW_CAMPAIGN', campaignId }),
        setSelectedEmail: (row) => dispatch({ type: 'SET_SELECTED_EMAIL', row }),
        setSearch: (query) => dispatch({ type: 'SET_SEARCH', query }),
        clearSearch: () => dispatch({ type: 'CLEAR_SEARCH' }),
        setStatusFilter: (status) => dispatch({ type: 'SET_STATUS_FILTER', status }),
        setSenderFilter: (senderId) => dispatch({ type: 'SET_SENDER_FILTER', senderId }),
        setSortOrder: (order) => dispatch({ type: 'SET_SORT_ORDER', order }),
        setShowCompose: (open) => dispatch({ type: 'SET_SHOW_COMPOSE', open }),
        setShowSenders: (open) => dispatch({ type: 'SET_SHOW_SENDERS', open }),
        setShowCommandPalette: (open) => dispatch({ type: 'SET_SHOW_COMMAND_PALETTE', open }),
        setShowMobileNav: (open) => dispatch({ type: 'SET_SHOW_MOBILE_NAV', open }),
        setMessage: (message) => dispatch({ type: 'SET_MESSAGE', message }),
        setError: (error) => dispatch({ type: 'SET_ERROR', error }),
        resetDashboard: () => dispatch({ type: 'RESET' }),
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
