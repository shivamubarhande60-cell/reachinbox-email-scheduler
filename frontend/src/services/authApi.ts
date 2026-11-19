import type { User } from '../types';
import { apiRequest } from './apiClient';

export const authApi = {
  getCurrentUser: () =>
    apiRequest<{ data: User }>('/api/v1/auth/me', {
      fallbackError: 'Could not check your sign-in status.',
    }),

  getDemoStatus: () =>
    apiRequest<{ enabled?: boolean }>('/api/v1/auth/demo-status', {
      fallbackError: 'Could not check local preview availability.',
    }),

  loginDemo: () =>
    apiRequest<{ status: string }>('/api/v1/auth/demo', {
      method: 'POST',
      fallbackError: 'Could not open the local preview.',
    }),

  logout: () =>
    apiRequest<{ status: string }>('/api/v1/auth/logout', {
      method: 'POST',
      fallbackError: 'Could not log out.',
    }),
};
