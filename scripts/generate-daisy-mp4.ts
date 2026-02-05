#!/usr/bin/env tsx

/**
 * Generate Daisy Genesis Animation Frames
 *
 * Usage:
 *   bun run scripts/generate-daisy-mp4.ts [date]
 *   bun run scripts/generate-daisy-mp4.ts 2026-01-26
 *
 * Generates 30-second animation at 30fps (900 frames).
 * Saves frames as PNG sequence, ready for ffmpeg conversion.
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

  if (args.length > 0) {
    dateStr = args[0];
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dateStr = yesterday.toISOString().split('T')[0];
  }

  console.log('🎬 Daisy Genesis Animation Generator');
  console.log('━'.repeat(50));
  console.log(`📅 Date: ${dateStr}`);
  console.log('🎞️  30 seconds @ 30fps = 900 frames');
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
    const framesDir = join(
      process.cwd(),
      'temp',
      'daisy-mp4',
      dateStr,
      'frames'
    );
    mkdirSync(framesDir, { recursive: true });

    // Generate animation frames
    console.log('🎬 Generating animation frames...');
    const startTime = Date.now();

    const frames = await generateGenesisAnimation(
      validSessions,
      dateStr,
      (current, total) => {
        if (current % 30 === 0 || current === total - 1) {
          process.stdout.write(
            `\r   Progress: ${current + 1}/${total} frames (${Math.round(((current + 1) / total) * 100)}%)`
          );
        }
      }
    );

    console.log(''); // New line after progress

    const frameGenTime = Date.now() - startTime;

    // Save all frames
    console.log('');
    console.log('💾 Saving frames...');

    let totalSize = 0;
    for (let i = 0; i < frames.length; i++) {
      const framePath = join(
        framesDir,
        `frame-${String(i).padStart(4, '0')}.png`
      );
      writeFileSync(framePath, frames[i]);
      totalSize += frames[i].length;

      if (i % 100 === 0 || i === frames.length - 1) {
        process.stdout.write(
          `\r   Saved: ${i + 1}/${frames.length} frames (${Math.round(((i + 1) / frames.length) * 100)}%)`
        );
      }
    }

    console.log('');

    const totalTime = Date.now() - startTime;
    const outputDir = join(process.cwd(), 'temp', 'daisy-mp4', dateStr);
    const mp4Path = join(outputDir, `daisy-${dateStr}-genesis.mp4`);

    console.log('');
    console.log('━'.repeat(50));
    console.log('✨ Frame Generation Complete!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Total frames: ${frames.length}`);
    console.log(`   Generation time: ${(frameGenTime / 1000).toFixed(1)}s`);
    console.log(`   Total time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`   Total size: ${formatBytes(totalSize)}`);
    console.log(`   Avg frame size: ${formatBytes(totalSize / frames.length)}`);
    console.log('');
    console.log('📁 Frames saved to:');
    console.log(`   ${framesDir}`);
    console.log('');
    console.log('🎬 To create MP4, run:');
    console.log('');
    console.log(
      `   ffmpeg -framerate 30 -i "${framesDir}\\frame-%04d.png" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p "${mp4Path}"`
    );
    console.log('');
    console.log('   Or for smaller file size (CRF 23):');
    console.log(
      `   ffmpeg -framerate 30 -i "${framesDir}\\frame-%04d.png" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p "${mp4Path}"`
    );

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
