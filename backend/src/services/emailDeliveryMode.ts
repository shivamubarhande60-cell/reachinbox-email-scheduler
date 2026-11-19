import { env } from '../config/env';

/**
 * Returns true when global simulated email delivery mode is enabled.
 */
export function isEmailSimulationEnabled(value = env.demo.emailSimulationMode): boolean {
  return value?.trim().toLowerCase() === 'true';
}

/**
 * Determines whether a specific send operation should be simulated instead of using SMTP.
 */
export function shouldSimulateEmailDelivery(
  senderIsSimulated: boolean | undefined,
  value = env.demo.emailSimulationMode,
): boolean {
  return senderIsSimulated === true || isEmailSimulationEnabled(value);
}
