import { LoaderCircle } from 'lucide-react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastViewport } from './components/common/ToastViewport';
import { DashboardView } from './components/dashboard/DashboardView';
import { LandingPage } from './components/landing/LandingPage';
import { AuthProvider } from './state/AuthContext';
import { DashboardProvider } from './state/DashboardContext';
import { ThemeProvider } from './state/ThemeContext';
import { ToastProvider } from './state/ToastContext';
import { useAuth } from './state/useAuth';

function AppShell() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa] text-sm text-zinc-500 dark:bg-[#09090b] dark:text-zinc-400">
        <LoaderCircle
          className="mr-2 animate-spin text-[#0f766e] dark:text-[#14b8a6]"
          size={17}
          aria-hidden="true"
        />
        <span>Loading workspace…</span>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <DashboardProvider>
      <DashboardView />
    </DashboardProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppShell />
            <ToastViewport />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
