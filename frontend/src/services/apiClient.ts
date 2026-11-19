import { env } from '../config/env';

/**
 * Typed HTTP error thrown by the centralized API client.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  fallbackError?: string;
}

/**
 * Performs an authenticated JSON request against the backend API with consistent error handling.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, fallbackError = 'Request failed.', ...rest } = options;

  const response = await fetch(`${env.apiUrl}${path}`, {
    credentials: 'include',
    ...rest,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let payload: { message?: string; code?: string } & T;
  try {
    payload = (await response.json()) as { message?: string; code?: string } & T;
  } catch {
    if (!response.ok) {
      throw new ApiError(fallbackError, response.status);
    }
    return {} as T;
  }

  if (!response.ok) {
    throw new ApiError(payload.message || fallbackError, response.status, payload.code);
  }

  return payload;
}

/**
 * Returns a user-friendly message from an unknown caught error.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
