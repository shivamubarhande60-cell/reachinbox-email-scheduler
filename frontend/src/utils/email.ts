/**
 * Extracts and deduplicates lowercase email addresses from freeform text or CSV content.
 */
export function parseAddresses(value: string): string[] {
  return [
    ...new Set(
      (value.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((email) =>
        email.toLowerCase(),
      ),
    ),
  ];
}
