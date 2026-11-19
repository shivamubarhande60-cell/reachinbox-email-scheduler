/**
 * Formats an ISO timestamp string into a localized medium date + short time string.
 */
export function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/**
 * Converts a Date object into a `YYYY-MM-DDTHH:mm` string for `<input type="datetime-local">`.
 */
export function toLocalDateTimeInput(value: Date): string {
  const local = new Date(value.getTime());
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}
