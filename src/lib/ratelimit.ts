import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Determine if rate limiting is enabled based on env vars
const isRateLimitEnabled =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

if (!isRateLimitEnabled) {
  console.warn(
    '⚠️ Rate Limiting disabled: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN'
  );
}

// Create a new ratelimiter, that allows 5 requests per 1 minute
const ratelimit = isRateLimitEnabled
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      analytics: true,
      prefix: '@upstash/ratelimit',
    })
  : null;

export async function checkRateLimit(identifier: string) {
  // If disabled, always succeed
  if (!ratelimit) {
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }

  try {
    const { success, limit, remaining, reset } =
      await ratelimit.limit(identifier);
    return { success, limit, remaining, reset };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open (allow request) if Redis is down, but log error
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}
