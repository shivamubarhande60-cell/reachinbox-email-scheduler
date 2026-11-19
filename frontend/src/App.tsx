import { LoaderCircle } from 'lucide-react';
import { LoginScreen } from './components/auth/LoginScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardView } from './components/dashboard/DashboardView';
import { AuthProvider, useAuth } from './state/AuthContext';
import { DashboardProvider } from './state/DashboardContext';

function AppShell() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f6] text-sm text-slate-500">
        <LoaderCircle className="mr-2 animate-spin" size={18} /> Loading your workspace...
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
