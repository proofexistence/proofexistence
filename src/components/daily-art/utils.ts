import { DAILY_THEMES, type DailyTheme } from './types';

/**
 * Simple seeded random number generator (mulberry32)
 */
export function createRandom(seed: number) {
  let state = seed;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Get day of year (1-366)
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Get the theme for a specific date
 * Uses a deterministic selection based on day of year
 */
export function getThemeForDate(date: Date): DailyTheme {
  const dayOfYear = getDayOfYear(date);
  // Use modulo to cycle through themes, but add year offset for variety across years
  const year = date.getUTCFullYear();
  const themeIndex = (dayOfYear + year * 7) % DAILY_THEMES.length;
  return DAILY_THEMES[themeIndex];
}

/**
 * Get candy palette for a specific date
 */
export function getCandyPaletteForDate(date: Date): readonly string[] {
  return getThemeForDate(date).petalColors;
}

/**
 * Get background color for a specific date
 */
export function getBackgroundForDate(date: Date): string {
  return getThemeForDate(date).background;
}

/**
 * Get center colors for a specific date
 */
export function getCenterColorsForDate(date: Date): readonly string[] {
  return getThemeForDate(date).centerColors;
}

/**
 * Get theme name for a specific date
 */
export function getThemeNameForDate(date: Date): string {
  return getThemeForDate(date).name;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Format time for display
 */
export function formatTimeUTC(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

/**
 * Check if two positions are too close (to avoid overlap)
 */
export function isTooClose(
  x: number,
  y: number,
  existingPositions: { x: number; y: number }[],
  minDistance: number
): boolean {
  for (const pos of existingPositions) {
    const dx = x - pos.x;
    const dy = y - pos.y;
    if (dx * dx + dy * dy < minDistance * minDistance) {
      return true;
    }
  }
  return false;
}

/**
 * Generate random positions for background flowers
 * Uses Poisson disk sampling for even distribution
 */
export function generateBackgroundPositions(
  canvasSize: number,
  count: number,
  minDistance: number,
  seed: number
): { x: number; y: number }[] {
  const random = createRandom(seed);
  const positions: { x: number; y: number }[] = [];
  const margin = canvasSize * 0.02;
  const maxAttempts = count * 10;

  let attempts = 0;
  while (positions.length < count && attempts < maxAttempts) {
    const x = margin + random() * (canvasSize - margin * 2);
    const y = margin + random() * (canvasSize - margin * 2);

    if (!isTooClose(x, y, positions, minDistance)) {
      positions.push({ x, y });
    }
    attempts++;
  }

  return positions;
}
