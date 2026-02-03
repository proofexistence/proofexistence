// src/lib/daisy/special-days.ts

interface SpecialDay {
  name: string;
  multiplier: number;
}

// 2026 Special Days with multipliers
const SPECIAL_DAYS_2026: Record<string, SpecialDay> = {
  '2026-01-01': { name: '元旦', multiplier: 2.0 },
  '2026-01-29': { name: '農曆新年', multiplier: 2.0 },
  '2026-02-14': { name: '情人節', multiplier: 2.0 },
  '2026-03-14': { name: '白色情人節', multiplier: 2.0 },
  '2026-04-05': { name: '復活節', multiplier: 2.0 },
  '2026-05-10': { name: '母親節', multiplier: 2.0 },
  '2026-06-21': { name: '父親節', multiplier: 2.0 },
  '2026-07-04': { name: '美國國慶', multiplier: 1.5 },
  '2026-08-19': { name: '七夕', multiplier: 2.0 },
  '2026-10-31': { name: '萬聖節', multiplier: 2.0 },
  '2026-11-26': { name: '感恩節', multiplier: 1.5 },
  '2026-12-25': { name: '聖誕節', multiplier: 2.0 },
  '2026-12-31': { name: '跨年夜', multiplier: 2.0 },
  // TODO: Add project anniversary date when confirmed
};

/**
 * Get special day info for a given date
 */
export function getSpecialDay(date: string): SpecialDay | null {
  return SPECIAL_DAYS_2026[date] || null;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: string): boolean {
  const d = new Date(date + 'T00:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Get the multiplier for a date (special day > weekend > regular)
 */
export function getDateMultiplier(date: string): {
  multiplier: number;
  reason: string | null;
} {
  const special = getSpecialDay(date);
  if (special) {
    return { multiplier: special.multiplier, reason: special.name };
  }

  if (isWeekend(date)) {
    return { multiplier: 1.2, reason: '週末' };
  }

  return { multiplier: 1.0, reason: null };
}

/**
 * Get quarter for a date (Q1-Q4)
 */
export function getQuarter(date: string): 1 | 2 | 3 | 4 {
  const month = new Date(date + 'T00:00:00Z').getUTCMonth() + 1;
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

/**
 * Get base price in POL for a quarter
 */
export function getQuarterBasePrice(quarter: 1 | 2 | 3 | 4): number {
  const prices: Record<number, number> = {
    1: 25,
    2: 35,
    3: 50,
    4: 75,
  };
  return prices[quarter];
}
