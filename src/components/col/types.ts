// Time granularity options
export type TimeGranularity = 'day' | 'month' | 'quarter' | 'year';

export const TIME_GRANULARITIES: TimeGranularity[] = ['day', 'month', 'quarter', 'year'];

// Trail point coordinate
export interface TrailPoint {
  x: number;
  y: number;
  z?: number;
  t?: number;
}

// Trail data from API
export interface ColTrail {
  id: string;
  trailData: TrailPoint[];
  color: string;
  createdAt: string;
  duration: number;
  userName?: string;
  title?: string;
}

// API response
export interface ColTrailsResponse {
  trails: ColTrail[];
  timeRange: {
    start: string;
    end: string;
  };
  count: number;
}

// Get date range for a given date and granularity
export function getDateRange(
  date: Date,
  granularity: TimeGranularity
): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();

  switch (granularity) {
    case 'day': {
      const start = new Date(year, month, date.getDate(), 0, 0, 0, 0);
      const end = new Date(year, month, date.getDate(), 23, 59, 59, 999);
      return { start, end };
    }
    case 'month': {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'quarter': {
      const quarterStart = Math.floor(month / 3) * 3;
      const start = new Date(year, quarterStart, 1, 0, 0, 0, 0);
      const end = new Date(year, quarterStart + 3, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'year': {
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
  }
}

// Navigate to previous/next period
export function navigateDate(
  date: Date,
  granularity: TimeGranularity,
  direction: 'prev' | 'next'
): Date {
  const delta = direction === 'prev' ? -1 : 1;
  const year = date.getFullYear();
  const month = date.getMonth();

  switch (granularity) {
    case 'day':
      return new Date(year, month, date.getDate() + delta);
    case 'month':
      return new Date(year, month + delta, 1);
    case 'quarter':
      return new Date(year, month + delta * 3, 1);
    case 'year':
      return new Date(year + delta, 0, 1);
  }
}

// Format date for display based on granularity
export function formatDateByGranularity(
  date: Date,
  granularity: TimeGranularity,
  locale: string = 'en'
): string {
  const year = date.getFullYear();
  const month = date.getMonth();

  switch (granularity) {
    case 'day':
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    case 'month':
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
      });
    case 'quarter': {
      const quarter = Math.floor(month / 3) + 1;
      return `Q${quarter} ${year}`;
    }
    case 'year':
      return `${year}`;
  }
}

// Trail with render state
export interface AnimatedTrail extends ColTrail {
  growthProgress: number;
  isVisible: boolean;
  harmonizedColor: string;
}
