// Dates in India time (spec §18.1: "today" is computed in Asia/Kolkata).
const IST_OFFSET_MIN = 330;

/** Today's date in IST as YYYY-MM-DD. */
export function todayIST(): string {
  const now = new Date(Date.now() + IST_OFFSET_MIN * 60_000);
  return now.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today" / "Yesterday" / "Oct 9" / "Oct 9, 2025" (year only if not this year). */
export function friendlyDate(iso: string): string {
  const today = todayIST();
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = iso.split('-').map(Number);
  const sameYear = String(y) === today.slice(0, 4);
  return `${MONTHS[m - 1]} ${d}${sameYear ? '' : `, ${y}`}`;
}

/** "now", "5m", "2h", "3d", then a date. */
export function timeAgo(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return friendlyDate(new Date(new Date(ts).getTime() + IST_OFFSET_MIN * 60_000).toISOString().slice(0, 10));
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
