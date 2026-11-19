import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { ApiError, getErrorMessage } from '../services/apiClient';
import { campaignApi } from '../services/campaignApi';
import { senderApi } from '../services/senderApi';
import type { Campaign, DashboardTab, EmailRow, Sender } from '../types';
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
  | { type: 'SHOW_CAMPAIGN'; campaignId: number }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'REFRESH_SEARCH' }
  | { type: 'SEARCH_SUCCESS'; query: string; rows: EmailRow[] }
  | { type: 'SEARCH_DONE' }
  | { type: 'SET_SHOW_COMPOSE'; open: boolean }
  | { type: 'SET_SHOW_SENDERS'; open: boolean }
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
    search: '',
    searchRefreshVersion: 0,
    searchResult: null,
    searchLoading: false,
    loading: false,
    activityStatus: 'connecting',
    showCompose: false,
    showSenders: false,
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
      };
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
    case 'SET_SHOW_COMPOSE':
      return { ...state, showCompose: action.open };
    case 'SET_SHOW_SENDERS':
      return { ...state, showSenders: action.open };
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
    if (state.dashboardSection === 'attention') {
      return rows.filter((row) => row.status === 'FAILED');
    }
    if (state.dashboardSection === 'campaign') {
      return (
        selectedCampaign?.leads.map((lead) => ({
          ...lead,
          subject: selectedCampaign.subject,
          name: selectedCampaign.name,
          senderId: selectedCampaign.senderId,
        })) || []
      );
    }
    const trimmedSearch = state.search.trim();
    if (trimmedSearch && state.searchResult?.query === trimmedSearch) {
      return state.searchResult.rows;
    }
    if (trimmedSearch) return [];
    return state.activeTab === 'scheduled' ? scheduledRows : sentRows;
  }, [
    state.dashboardSection,
    state.search,
    state.searchResult,
    state.activeTab,
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
        showCampaign: (campaignId) => dispatch({ type: 'SHOW_CAMPAIGN', campaignId }),
        setSearch: (query) => dispatch({ type: 'SET_SEARCH', query }),
        clearSearch: () => dispatch({ type: 'CLEAR_SEARCH' }),
        setShowCompose: (open) => dispatch({ type: 'SET_SHOW_COMPOSE', open }),
        setShowSenders: (open) => dispatch({ type: 'SET_SHOW_SENDERS', open }),
        setMessage: (message) => dispatch({ type: 'SET_MESSAGE', message }),
        setError: (error) => dispatch({ type: 'SET_ERROR', error }),
        resetDashboard: () => dispatch({ type: 'RESET' }),
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
