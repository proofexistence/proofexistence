export const LAUNCH_DATE_ISO =
  process.env.NEXT_PUBLIC_LAUNCH_DATE || '2026-01-01T00:00:00Z';

// End of POE 2026 - countdown to this date
export const END_DATE_ISO = '2027-01-01T00:00:00Z';

export function isLaunchTime() {
  if (typeof window !== 'undefined') {
    if (window.localStorage.getItem('bypass_launch') === 'true') return true;
  }

  if (process.env.NEXT_PUBLIC_BYPASS_LAUNCH === 'true') return true;

  const now = new Date();
  const launch = new Date(LAUNCH_DATE_ISO);
  return now >= launch;
}

export function getTimeUntilEnd() {
  const now = new Date();
  const end = new Date(END_DATE_ISO);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, finished: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, finished: false };
}
