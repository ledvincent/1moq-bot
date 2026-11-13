// Dates and times as the pages show them, in the browser's time zone.

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "13 Nov 2026". */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** "13 Nov 2026, 14:05". */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}
