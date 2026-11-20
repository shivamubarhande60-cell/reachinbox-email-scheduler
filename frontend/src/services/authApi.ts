import type { User } from '../types';
import { apiRequest } from './apiClient';

export interface AuthCapabilities {
  enabled?: boolean;
  googleConfigured?: boolean;
  passwordAuthEnabled?: boolean;
}

export const authApi = {
  getCurrentUser: () =>
    apiRequest<{ data: User }>('/api/v1/auth/me', {
      fallbackError: 'Could not check your sign-in status.',
    }),

  getDemoStatus: () =>
    apiRequest<AuthCapabilities>('/api/v1/auth/demo-status', {
      fallbackError: 'Could not check authentication capabilities.',
    }),

  loginDemo: () =>
    apiRequest<{ status: string }>('/api/v1/auth/demo', {
      method: 'POST',
      fallbackError: 'Could not open the live demo workspace.',
    }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<{ status: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: payload,
      fallbackError: 'Invalid email or password.',
    }),

  register: (payload: { name: string; email: string; password: string }) =>
    apiRequest<{ status: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: payload,
      fallbackError: 'Could not create your account.',
    }),

  logout: () =>
    apiRequest<{ status: string }>('/api/v1/auth/logout', {
      method: 'POST',
      fallbackError: 'Could not log out.',
    }),
};
