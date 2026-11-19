import { apiRequest } from './apiClient';

export const slackApi = {
  disconnect: () =>
    apiRequest<{ status: string }>('/api/v1/slack', {
      method: 'DELETE',
      fallbackError: 'Could not disconnect Slack.',
    }),
};
