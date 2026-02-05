#!/usr/bin/env tsx

/**
 * Test script for Daisy Genesis Animation
 *
 * Usage:
 *   bun run scripts/test-daisy-animation.ts [date] [maxFrames]
 *   bun run scripts/test-daisy-animation.ts 2026-02-01 10
 *
 * Generates sample frames from Genesis animation.
 */

import { db } from '../src/db';
import { sessions, users } from '../src/db/schema';
import { between, sql } from 'drizzle-orm';
import { generateGenesisAnimation } from '../src/lib/daisy/render-animation';
import type { DailyArtSession } from '../src/components/daily-art/types';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  const args = process.argv.slice(2);
  let dateStr: string;
  let maxFrames = 10; // Default: only generate first 10 frames for preview

  if (args.length > 0) {
    dateStr = args[0];
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dateStr = yesterday.toISOString().split('T')[0];
  }

  if (args.length > 1) {
    maxFrames = parseInt(args[1]);
  }

  console.log('🎬 Daisy Genesis Animation Test');
  console.log('━'.repeat(50));
  console.log(`📅 Date: ${dateStr}`);
  console.log(`🎞️  Generating ${maxFrames} sample frames`);
  console.log('');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.error('❌ Invalid date format. Use YYYY-MM-DD');
    process.exit(1);
  }

  try {
    // Fetch sessions
    console.log('📊 Fetching sessions...');
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

    console.log(`   Found ${sessionsData.length} sessions`);

    if (sessionsData.length === 0) {
      console.warn('⚠️  No sessions found for this date');
      process.exit(0);
    }

    const validSessions: DailyArtSession[] = sessionsData
      .filter((s) => Array.isArray(s.trailData) && s.trailData.length > 0)
      .map((s) => ({
        id: s.id,
        trailData: s.trailData as any,
        color: s.color || '#ffffff',
        duration: s.duration,
        createdAt: s.createdAt.toISOString(),
        userName: s.userName || undefined,
        title: s.title || undefined,
      }));

    console.log(`   Valid sessions: ${validSessions.length}`);
    console.log('');

    // Create output directory
    const outputDir = join(process.cwd(), 'temp', 'daisy-animation', dateStr);
    mkdirSync(outputDir, { recursive: true });

    // Generate animation frames
    console.log('🎬 Generating animation frames...');
    const startTime = Date.now();

    const frames = await generateGenesisAnimation(
      validSessions,
      dateStr,
      (current, total) => {
        if (current % 10 === 0 || current === total - 1) {
          process.stdout.write(
            `\r   Progress: ${current + 1}/${total} frames (${Math.round(((current + 1) / total) * 100)}%)`
          );
        }
      }
    );

    console.log(''); // New line after progress

    const totalTime = Date.now() - startTime;

    // Save sample frames
    const framesToSave = Math.min(maxFrames, frames.length);
    const interval = Math.floor(frames.length / framesToSave);

    console.log('');
    console.log(`💾 Saving ${framesToSave} sample frames...`);

    for (let i = 0; i < framesToSave; i++) {
      const frameIndex = i * interval;
      const framePath = join(
        outputDir,
        `frame-${String(frameIndex).padStart(4, '0')}.png`
      );
      writeFileSync(framePath, frames[frameIndex]);
    }

    // Calculate stats
    const avgFrameSize =
      frames.reduce((sum, f) => sum + f.length, 0) / frames.length;

    console.log('');
    console.log('━'.repeat(50));
    console.log('✨ Animation Generation Complete!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Total frames: ${frames.length}`);
    console.log(`   Average frame size: ${formatBytes(avgFrameSize)}`);
    console.log(
      `   Estimated video size: ${formatBytes(avgFrameSize * frames.length)}`
    );
    console.log(`   Generation time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log('');
    console.log('🖼️  Sample frames saved to:');
    console.log(`   ${outputDir}`);
    console.log('');
    console.log('💡 Next steps:');
    console.log('   - Install ffmpeg to convert frames to MP4');
    console.log('   - Or use online tools to create video from frame sequence');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

main();
