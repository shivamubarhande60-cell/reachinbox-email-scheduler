import type { Sender } from '../types';
import { apiRequest } from './apiClient';

export interface CreateSenderPayload {
  name: string;
  from: string;
  host: string;
  port: number;
  username: string;
  password: string;
  maxEmailsPerHour: number;
  minimumDelayMs: number;
}

export interface ListSendersResponse {
  data?: Sender[];
  maxEmailsPerHour?: number;
  minimumDelayMs?: number;
}

export const senderApi = {
  listSenders: () =>
    apiRequest<ListSendersResponse>('/api/v1/senders', {
      fallbackError: 'Could not load senders.',
    }),

  createSender: (payload: CreateSenderPayload) =>
    apiRequest<{ message?: string }>('/api/v1/senders', {
      method: 'POST',
      body: payload,
      fallbackError: 'Could not connect this sender.',
    }),

  removeSender: (senderId: string) =>
    apiRequest<{ message?: string }>(`/api/v1/senders/${encodeURIComponent(senderId)}`, {
      method: 'DELETE',
      fallbackError: 'Could not remove this sender.',
    }),
};
