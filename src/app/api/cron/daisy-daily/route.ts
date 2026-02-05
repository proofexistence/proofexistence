import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sessions, users, daisyMints } from '@/db/schema';
import { between, sql } from 'drizzle-orm';
import { renderDaisyVisualization } from '@/lib/daisy/render-daisy';
import type { DailyArtSession } from '@/components/daily-art/types';
import { getSpecialDay, getDateMultiplier } from '@/lib/daisy/special-days';
import { generateParticipantsMerkleTree } from '@/lib/merkle/participants';

// Force dynamic to avoid caching
export const dynamic = 'force-dynamic';

interface GenerationResult {
  date: string;
  genesisImage: Buffer;
  genesisSize: number;
  standardImage: Buffer;
  standardSize: number;
  sessionCount: number;
  participantCount: number;
  theme: string;
  dominantColor?: string;
  merkleRoot: string;
  isSpecialDay: boolean;
  specialDayName?: string;
  specialDayMultiplier: number;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Security Check - Vercel Cron uses Authorization: Bearer <CRON_SECRET>
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get target date (defaults to yesterday)
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam + 'T00:00:00Z');
    } else {
      // Default: yesterday
      targetDate = new Date();
      targetDate.setUTCDate(targetDate.getUTCDate() - 1);
      targetDate.setUTCHours(0, 0, 0, 0);
    }

    const dateStr = targetDate.toISOString().split('T')[0];
    console.log('[Daisy Daily] Generating for date:', dateStr);

    // 3. Check if already generated
    const [existing] = await db
      .select()
      .from(daisyMints)
      .where(sql`${daisyMints.date} = ${dateStr}`)
      .limit(1);

    if (existing && existing.status !== 'pending') {
      return NextResponse.json({
        message: 'Already generated',
        date: dateStr,
        daisyId: existing.id,
      });
    }

    // 4. Fetch sessions from target date
    const startOfDay = new Date(dateStr + 'T00:00:00Z');
    const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

    const sessionsData = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        trailData: sessions.trailData,
        color: sessions.color,
        duration: sessions.duration,
        createdAt: sessions.createdAt,
        userName: users.name,
        title: sessions.title,
      })
      .from(sessions)
      .leftJoin(users, sql`${sessions.userId} = ${users.id}`)
      .where(between(sessions.createdAt, startOfDay, endOfDay));

    console.log('[Daisy Daily] Found sessions:', sessionsData.length);

    if (sessionsData.length === 0) {
      return NextResponse.json({
        message: 'No sessions found for this date',
        date: dateStr,
      });
    }

    // 5. Process sessions for rendering
    const validSessions: DailyArtSession[] = sessionsData
      .filter((s) => Array.isArray(s.trailData) && s.trailData.length > 0)
      .map((s) => ({
        id: s.id,
        trailData: s.trailData as {
          x: number;
          y: number;
          z?: number;
          t?: number;
        }[],
        color: s.color || '#ffffff',
        duration: s.duration,
        createdAt: s.createdAt.toISOString(),
        userName: s.userName || undefined,
        title: s.title || undefined,
      }));

    console.log('[Daisy Daily] Valid sessions:', validSessions.length);

    // 6. Get unique participants
    const participantIds = new Set(sessionsData.map((s) => s.userId));
    const participantCount = participantIds.size;

    // Get participant wallet addresses for Merkle tree
    const participantWallets = await db
      .select({ walletAddress: users.walletAddress })
      .from(users)
      .where(
        sql`${users.id} IN (
          SELECT DISTINCT ${sessions.userId}
          FROM ${sessions}
          WHERE ${sessions.createdAt} BETWEEN ${startOfDay} AND ${endOfDay}
        )`
      );

    const walletAddresses = participantWallets
      .map((p) => p.walletAddress)
      .filter((addr): addr is string => addr !== null);

    // Generate Merkle tree for free mints
    const { root: merkleRoot } =
      generateParticipantsMerkleTree(walletAddresses);

    // 7. Check if special day
    const specialDay = getSpecialDay(dateStr);
    const { multiplier: dateMultiplier } = getDateMultiplier(dateStr);

    // 8. Generate images
    console.log('[Daisy Daily] Generating Genesis image...');
    const genesisResult = await renderDaisyVisualization(
      validSessions,
      dateStr,
      { edition: 'genesis' }
    );

    console.log('[Daisy Daily] Generating Standard image...');
    const standardResult = await renderDaisyVisualization(
      validSessions,
      dateStr,
      { edition: 'standard' }
    );

    const result: GenerationResult = {
      date: dateStr,
      genesisImage: genesisResult.staticImage,
      genesisSize: genesisResult.staticImage.length,
      standardImage: standardResult.staticImage,
      standardSize: standardResult.staticImage.length,
      sessionCount: validSessions.length,
      participantCount,
      theme: 'Theme placeholder', // TODO: Get actual theme name
      merkleRoot: merkleRoot,
      isSpecialDay: !!specialDay,
      specialDayName: specialDay?.name,
      specialDayMultiplier: dateMultiplier,
    };

    // 9. Create or update daisyMints record
    if (existing) {
      await db
        .update(daisyMints)
        .set({
          participantCount,
          sessionCount: validSessions.length,
          participantsMerkleRoot: merkleRoot,
          isSpecialDay: result.isSpecialDay,
          specialDayName: result.specialDayName,
          specialDayMultiplier: result.specialDayMultiplier.toString(),
          status: 'generated',
          updatedAt: new Date(),
        })
        .where(sql`${daisyMints.id} = ${existing.id}`);
    } else {
      await db.insert(daisyMints).values({
        date: dateStr,
        participantCount,
        sessionCount: validSessions.length,
        participantsMerkleRoot: merkleRoot,
        isSpecialDay: result.isSpecialDay,
        specialDayName: result.specialDayName,
        specialDayMultiplier: result.specialDayMultiplier.toString(),
        status: 'generated',
      });
    }

    console.log('[Daisy Daily] Generation complete');
    console.log('[Daisy Daily] Genesis size:', formatBytes(result.genesisSize));
    console.log(
      '[Daisy Daily] Standard size:',
      formatBytes(result.standardSize)
    );

    // Return result (without large image buffers)
    return NextResponse.json({
      success: true,
      date: result.date,
      sessionCount: result.sessionCount,
      participantCount: result.participantCount,
      theme: result.theme,
      merkleRoot: result.merkleRoot,
      isSpecialDay: result.isSpecialDay,
      specialDayName: result.specialDayName,
      specialDayMultiplier: result.specialDayMultiplier,
      fileSizes: {
        genesis: formatBytes(result.genesisSize),
        genesisBytes: result.genesisSize,
        standard: formatBytes(result.standardSize),
        standardBytes: result.standardSize,
      },
    });
  } catch (error) {
    console.error('[Daisy Daily] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
