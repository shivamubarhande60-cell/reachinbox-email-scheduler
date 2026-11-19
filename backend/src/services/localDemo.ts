/**
 * Returns true only when local preview login is explicitly enabled on a local non-production request.
 */
export function isLocalDemoEnabled(
  environment: string | undefined,
  enabled: string | undefined,
  remoteAddress: string | undefined,
): boolean {
  const isLoopback =
    remoteAddress === '127.0.0.1' ||
    remoteAddress === '::1' ||
    remoteAddress === '::ffff:127.0.0.1';
  return environment !== 'production' && enabled === 'true' && isLoopback;
}
