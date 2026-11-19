import { useContext } from 'react';
import { DashboardContext, type DashboardContextValue } from './dashboardContextDef';

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within a DashboardProvider.');
  }
  return ctx;
}
