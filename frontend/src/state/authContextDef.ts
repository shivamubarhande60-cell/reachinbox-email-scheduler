import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  authError: string;
  demoEnabled: boolean;
  googleConfigured: boolean;
  demoLoading: boolean;
  slackBusy: boolean;
  loadUser: () => Promise<void>;
  clearUser: () => void;
  startDemoLogin: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  disconnectSlack: () => Promise<string | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
