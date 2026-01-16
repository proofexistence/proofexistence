-- ============================================================================
-- Badge System Seed Data
-- ============================================================================
-- This file contains the initial badge definitions for Proof of Existence
--
-- Usage:
--   Run this SQL against your database to insert all badge records
--   The name/description fields contain English fallback values
--   UI should use i18n translation keys from src/messages/{locale}.json
--
-- Translation Keys:
--   badges.{badge-id}.name
--   badges.{badge-id}.description
-- ============================================================================

INSERT INTO badges (id, name, description, image_url) VALUES
  -- Early Adopter Badge
  (
    'early-adopter-top-100',
    'Early Adopter',
    'One of the first 100 pioneers to join Proof of Existence',
    '/badges/early-adopter.svg'
  ),

  -- Marathon Artist Badge
  (
    'marathon-artist',
    'Marathon Artist',
    'Longest single creation session',
    '/badges/marathon-artist.svg'
  ),

  -- Prolific Creator Badge
  (
    'prolific-creator',
    'Prolific Creator',
    'Most active user with highest creation count',
    '/badges/prolific-creator.svg'
  ),

  -- Streak Master Badge
  (
    'streak-master',
    'Streak Master',
    'Longest consecutive creation streak',
    '/badges/streak-master.svg'
  ),

  -- Most Liked Badge
  (
    'most-liked',
    'Most Liked',
    'Most community likes received',
    '/badges/most-liked.svg'
  ),

  -- Collection Star Badge
  (
    'collection-star',
    'Collection Star',
    'Most bookmarked artwork',
    '/badges/collection-star.svg'
  ),

  -- Generous Giver Badge
  (
    'generous-giver',
    'Generous Giver',
    'Most TIME26 tokens donated',
    '/badges/generous-giver.svg'
  ),

  -- Reward Collector Badge
  (
    'reward-collector',
    'Reward Collector',
    'Most TIME26 rewards accumulated',
    '/badges/reward-collector.svg'
  ),

  -- Referral Ambassador Badge
  (
    'referral-ambassador',
    'Referral Ambassador',
    'Successfully referred the most new users',
    '/badges/referral-ambassador.svg'
  ),

  -- Distance Explorer Badge
  (
    'distance-explorer',
    'Distance Explorer',
    'Longest light trail distance drawn',
    '/badges/distance-explorer.svg'
  ),

  -- Speed Demon Badge
  (
    'speed-demon',
    'Speed Demon',
    'Fastest drawing speed creator',
    '/badges/speed-demon.svg'
  )

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify all badges were inserted correctly:
-- SELECT id, name, image_url FROM badges ORDER BY id;
