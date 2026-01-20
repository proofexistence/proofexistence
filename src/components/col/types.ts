// Time range options
export type TimeRange = '1h' | '1d' | '1w' | '1m' | '3m' | '6m' | '1y';

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

// Time range display info
export interface TimeRangeInfo {
  value: TimeRange;
  label: string;
  labelZh: string;
}

export const TIME_RANGES: TimeRangeInfo[] = [
  { value: '1h', label: 'Last Hour', labelZh: '一小時' },
  { value: '1d', label: 'Last Day', labelZh: '一天' },
  { value: '1w', label: 'Last Week', labelZh: '一週' },
  { value: '1m', label: 'Last Month', labelZh: '一個月' },
  { value: '3m', label: 'Last Quarter', labelZh: '一季' },
  { value: '6m', label: 'Last 6 Months', labelZh: '半年' },
  { value: '1y', label: 'Last Year', labelZh: '一年' },
];

// Get duration in milliseconds for a time range
export function getTimeRangeDuration(range: TimeRange): number {
  switch (range) {
    case '1h':
      return 60 * 60 * 1000;
    case '1d':
      return 24 * 60 * 60 * 1000;
    case '1w':
      return 7 * 24 * 60 * 60 * 1000;
    case '1m':
      return 30 * 24 * 60 * 60 * 1000;
    case '3m':
      return 90 * 24 * 60 * 60 * 1000;
    case '6m':
      return 180 * 24 * 60 * 60 * 1000;
    case '1y':
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

// Trail with render state
export interface AnimatedTrail extends ColTrail {
  growthProgress: number;
  isVisible: boolean;
  harmonizedColor: string;
}
