// src/lib/daisy/pricing.ts

import { getDateMultiplier, getQuarter, getQuarterBasePrice } from './special-days';

interface PricingFactors {
  quarterBasePrice: number;
  timeMultiplier: number;
  participantMultiplier: number;
  dateMultiplier: number;
  dateReason: string | null;
}

interface PriceResult {
  finalPrice: number; // in POL
  factors: PricingFactors;
}

/**
 * Calculate time multiplier based on remaining hours until mint closes
 * Phase 2 only (Phase 1 has no time limit)
 */
export function getTimeMultiplier(hoursRemaining: number | null): number {
  if (hoursRemaining === null) return 1.0; // Phase 1: no time limit

  if (hoursRemaining > 12) return 1.0;
  if (hoursRemaining > 6) return 1.1;
  if (hoursRemaining > 1) return 1.25;
  return 1.5;
}

/**
 * Calculate participant multiplier based on daily participant count
 */
export function getParticipantMultiplier(participantCount: number): number {
  if (participantCount < 50) return 1.0;
  if (participantCount < 200) return 1.2;
  if (participantCount < 500) return 1.5;
  return 2.0;
}

/**
 * Calculate the Standard edition price for a given date
 */
export function calculateStandardPrice(
  date: string,
  participantCount: number,
  hoursRemaining: number | null = null
): PriceResult {
  const quarter = getQuarter(date);
  const quarterBasePrice = getQuarterBasePrice(quarter);

  const timeMultiplier = getTimeMultiplier(hoursRemaining);
  const participantMultiplier = getParticipantMultiplier(participantCount);
  const { multiplier: dateMultiplier, reason: dateReason } = getDateMultiplier(date);

  const finalPrice = quarterBasePrice * timeMultiplier * participantMultiplier * dateMultiplier;

  return {
    finalPrice: Math.round(finalPrice * 100) / 100, // Round to 2 decimal places
    factors: {
      quarterBasePrice,
      timeMultiplier,
      participantMultiplier,
      dateMultiplier,
      dateReason,
    },
  };
}

/**
 * Genesis auction constants
 */
export const GENESIS_AUCTION = {
  START_PRICE: 250, // POL
  MIN_BID_INCREMENT_PERCENT: 10, // 10%
  DURATION_HOURS: 24,
  EXTENSION_MINUTES: 10,
  EXTENSION_THRESHOLD_MINUTES: 10,
};

/**
 * Calculate minimum next bid for Genesis auction
 */
export function calculateMinNextBid(currentBid: number): number {
  const increment = currentBid * (GENESIS_AUCTION.MIN_BID_INCREMENT_PERCENT / 100);
  return Math.ceil((currentBid + increment) * 100) / 100;
}
