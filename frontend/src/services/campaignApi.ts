import type { Campaign, EmailRow } from '../types';
import { apiRequest } from './apiClient';

export interface ScheduleCampaignPayload {
  name?: string;
  subject: string;
  body: string;
  emails: string[];
  senderId: string;
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
}

export const campaignApi = {
  listCampaigns: () =>
    apiRequest<{ data?: Campaign[] }>('/api/v1/campaigns', {
      fallbackError: 'Could not load emails.',
    }),

  scheduleCampaign: (payload: ScheduleCampaignPayload, idempotencyKey: string) =>
    apiRequest<{ message?: string; campaignId: number; count: number }>('/api/v1/campaigns/schedule', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: payload,
      fallbackError: 'Could not schedule these emails.',
    }),

  searchEmails: (query: string, signal?: AbortSignal) =>
    apiRequest<{ data?: EmailRow[] }>(
      `/api/v1/emails/search?q=${encodeURIComponent(query)}`,
      {
        signal,
        fallbackError: 'Search failed.',
      },
    ),
};
