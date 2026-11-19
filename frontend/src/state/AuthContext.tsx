import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, getErrorMessage } from '../services/apiClient';
import { authApi } from '../services/authApi';
import { slackApi } from '../services/slackApi';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  authError: string;
  demoEnabled: boolean;
  demoLoading: boolean;
  slackBusy: boolean;
  loadUser: () => Promise<void>;
  clearUser: () => void;
  startDemoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  disconnectSlack: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [slackBusy, setSlackBusy] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const result = await authApi.getCurrentUser();
      setUser(result.data);
      setAuthError('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
      } else {
        setAuthError('Could not reach the scheduler. Start the backend and try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
    void authApi
      .getDemoStatus()
      .then((result) => setDemoEnabled(result.enabled === true))
      .catch(() => setDemoEnabled(false));
  }, [loadUser]);

  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  const startDemoLogin = useCallback(async () => {
    setDemoLoading(true);
    setAuthError('');
    try {
      await authApi.loginDemo();
      await loadUser();
    } catch (error) {
      setAuthError(getErrorMessage(error, 'Could not open the local preview.'));
    } finally {
      setDemoLoading(false);
    }
  }, [loadUser]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const disconnectSlack = useCallback(async (): Promise<string | null> => {
    setSlackBusy(true);
    try {
      await slackApi.disconnect();
      await loadUser();
      return null;
    } catch (error) {
      return getErrorMessage(error, 'Could not disconnect Slack.');
    } finally {
      setSlackBusy(false);
    }
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        authError,
        demoEnabled,
        demoLoading,
        slackBusy,
        loadUser,
        clearUser,
        startDemoLogin,
        logout,
        disconnectSlack,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return ctx;
}
