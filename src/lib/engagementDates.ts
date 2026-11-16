/**
 * Date helpers for the admin engagement dashboard.
 *
 * The backend reads and buckets dates in IST (Asia/Kolkata), so "today" and the week
 * boundaries here are computed in IST too, whatever the browser's own time zone is.
 * Dates are plain yyyy-MM-dd strings and are shifted with UTC arithmetic, which avoids
 * daylight-saving and time zone surprises.
 */

const IST = 'Asia/Kolkata';

/** Backend limit on the length of a report range, in days between `from` and `to`. */
export const MAX_RANGE_DAYS = 366;

export const DEFAULT_RANGE_DAYS = 30;

export const TREND_WEEKS = 8;

const istFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Today's date in IST as yyyy-MM-dd. */
export function todayInIst(now: Date = new Date()): string {
  return istFormat.format(now);
}

export function addDays(iso: string, days: number): string {
  const date = parse(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

/** Monday of the week containing `iso` (weeks start on Monday, like the backend). */
export function mondayOf(iso: string): string {
  const dayOfWeek = parse(iso).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dayOfWeek + 6) % 7));
}

/** The Mondays of the last `count` weeks, oldest first, ending with the current week. */
export function lastWeekStarts(today: string, count: number = TREND_WEEKS): string[] {
  const currentMonday = mondayOf(today);
  return Array.from({ length: count }, (_, i) => addDays(currentMonday, -7 * (count - 1 - i)));
}

/** Default report range: the last 30 days ending today (IST). */
export function defaultRange(today: string): { from: string; to: string } {
  return { from: addDays(today, -DEFAULT_RANGE_DAYS), to: today };
}

/** Returns an error message for an invalid range, or null when it is valid. */
export function validateRange(from: string, to: string): string | null {
  if (!from || !to) return 'Choose both a start and an end date.';
  if (from > to) return 'The start date must be on or before the end date.';
  if (daysBetween(from, to) > MAX_RANGE_DAYS) {
    return `The date range cannot be longer than ${MAX_RANGE_DAYS} days.`;
  }
  return null;
}
