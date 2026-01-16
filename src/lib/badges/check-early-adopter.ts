import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { awardBadge } from './award-badge';

/**
 * Check and award Early Adopter badge to top 100 users who have created proofs
 * Only users who have at least one session (proof) qualify
 * This should be called periodically or when a new user creates their first proof
 */
export async function checkAndAwardEarlyAdopterBadge() {
  try {
    // Get the first 100 users who have created at least one proof
    // Ordered by their first proof creation time
    const earlyUsers = await db.execute<{
      id: string;
      walletAddress: string;
      firstProofAt: Date;
    }>(sql`
      SELECT
        u.id,
        u.wallet_address as "walletAddress",
        MIN(s.created_at) as "firstProofAt"
      FROM users u
      INNER JOIN sessions s ON s.user_id = u.id
      WHERE s.status IN ('MINTED', 'SETTLED', 'PENDING')
      GROUP BY u.id, u.wallet_address
      ORDER BY MIN(s.created_at) ASC
      LIMIT 100
    `);

    const results = {
      checked: earlyUsers.rows.length,
      awarded: 0,
      alreadyHad: 0,
      errors: 0,
    };

    // Award badge to each of these users
    for (const user of earlyUsers.rows) {
      try {
        const awarded = await awardBadge(user.id, 'early-adopter-top-100');
        if (awarded) {
          results.awarded++;
          console.log(
            `✅ Awarded Early Adopter badge to user ${user.walletAddress} (first proof: ${user.firstProofAt})`
          );
        } else {
          results.alreadyHad++;
        }
      } catch (error) {
        console.error(
          `Error awarding badge to user ${user.walletAddress}:`,
          error
        );
        results.errors++;
      }
    }

    return results;
  } catch (error) {
    console.error('Error in checkAndAwardEarlyAdopterBadge:', error);
    throw error;
  }
}

/**
 * Check if a specific user qualifies for Early Adopter badge
 * User must have created at least one proof to qualify
 */
export async function checkUserForEarlyAdopter(userId: string) {
  try {
    // Get user's rank among users who have created proofs
    // Ranked by their first proof creation time
    const result = await db.execute<{ rank: number; firstProofAt: Date }>(sql`
      WITH ranked_users AS (
        SELECT
          u.id,
          MIN(s.created_at) as first_proof_at,
          ROW_NUMBER() OVER (ORDER BY MIN(s.created_at) ASC) as rank
        FROM users u
        INNER JOIN sessions s ON s.user_id = u.id
        WHERE s.status IN ('MINTED', 'SETTLED', 'PENDING')
        GROUP BY u.id
      )
      SELECT rank::int, first_proof_at as "firstProofAt"
      FROM ranked_users
      WHERE id = ${userId}
    `);

    const rank = result.rows[0]?.rank;
    const firstProofAt = result.rows[0]?.firstProofAt;

    if (!rank || rank > 100) {
      return {
        qualifies: false,
        rank: rank || null,
        hasProof: !!firstProofAt,
      };
    }

    // User is in top 100 proof creators, award badge
    const awarded = await awardBadge(userId, 'early-adopter-top-100');

    return {
      qualifies: true,
      rank,
      awarded,
      firstProofAt,
    };
  } catch (error) {
    console.error('Error checking user for Early Adopter badge:', error);
    throw error;
  }
}
