/**
 * Centralized frontend environment configuration.
 */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000'),
  isProd: import.meta.env.PROD,
};
