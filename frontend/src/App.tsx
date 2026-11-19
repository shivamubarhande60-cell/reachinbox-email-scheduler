import { LoaderCircle } from 'lucide-react';
import { LoginScreen } from './components/auth/LoginScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardView } from './components/dashboard/DashboardView';
import { AuthProvider } from './state/AuthContext';
import { DashboardProvider } from './state/DashboardContext';
import { useAuth } from './state/useAuth';

function AppShell() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa] text-sm text-zinc-500">
        <LoaderCircle className="mr-2 animate-spin text-[#0f766e]" size={17} aria-hidden="true" />
        <span>Loading workspace…</span>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
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
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
