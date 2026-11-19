import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ApiError, getErrorMessage } from '../services/apiClient';
import { authApi } from '../services/authApi';
import { slackApi } from '../services/slackApi';
import type { User } from '../types';
import { AuthContext } from './authContextDef';

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
    let cancelled = false;

    void (async () => {
      try {
        const result = await authApi.getCurrentUser();
        if (!cancelled) {
          setUser(result.data);
          setAuthError('');
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && error.status === 401) {
            setUser(null);
          } else {
            setAuthError('Could not reach the scheduler. Start the backend and try again.');
          }
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    })();

    void authApi
      .getDemoStatus()
      .then((result) => {
        if (!cancelled) {
          setDemoEnabled(result.enabled === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDemoEnabled(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
