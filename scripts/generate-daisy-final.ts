#!/usr/bin/env tsx

/**
 * Generate Final Daisy NFT Assets (1 PNG + 1 MP4)
 *
 * Usage:
 *   bun run scripts/generate-daisy-final.ts [date]
 *   bun run scripts/generate-daisy-final.ts 2026-01-26
 *
 * Output:
 *   - daisy-[date]-standard.png (靜態圖片)
 *   - daisy-[date]-genesis.mp4 (30秒動畫)
 */

import { db } from '../src/db';
import { sessions, users } from '../src/db/schema';
import { between, sql } from 'drizzle-orm';
import { renderDaisyVisualization } from '../src/lib/daisy/render-daisy';
import { generateGenesisAnimation } from '../src/lib/daisy/render-animation';
import type { DailyArtSession } from '../src/components/daily-art/types';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

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

  console.log('🌼 Daisy NFT Final Assets Generator');
  console.log('━'.repeat(60));
  console.log(`📅 Date: ${dateStr}`);
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

    // Create output directories
    const outputDir = join(process.cwd(), 'temp', 'daisy-final', dateStr);
    const framesDir = join(outputDir, 'frames');
    mkdirSync(framesDir, { recursive: true });

    // ======================
    // STEP 1: Generate Static PNG
    // ======================
    console.log('🎨 [1/3] Generating Static PNG...');
    const pngStartTime = Date.now();

    const staticResult = await renderDaisyVisualization(
      validSessions,
      dateStr,
      { edition: 'standard' }
    );

    const pngPath = join(outputDir, `daisy-${dateStr}-standard.png`);
    writeFileSync(pngPath, staticResult.staticImage);

    const pngTime = Date.now() - pngStartTime;
    console.log(`   ✅ PNG generated in ${(pngTime / 1000).toFixed(1)}s`);
    console.log(`   📁 Size: ${formatBytes(staticResult.staticImage.length)}`);
    console.log('');

    // ======================
    // STEP 2: Generate Animation Frames
    // ======================
    console.log('🎬 [2/3] Generating Animation Frames (900 frames)...');
    const framesStartTime = Date.now();

    const frames = await generateGenesisAnimation(
      validSessions,
      dateStr,
      (current, total) => {
        if (current % 50 === 0 || current === total - 1) {
          process.stdout.write(
            `\r   Progress: ${current + 1}/${total} frames (${Math.round(((current + 1) / total) * 100)}%)`
          );
        }
      }
    );

    console.log('');

    // Save frames
    console.log('   💾 Saving frames...');
    for (let i = 0; i < frames.length; i++) {
      const framePath = join(
        framesDir,
        `frame-${String(i).padStart(4, '0')}.png`
      );
      writeFileSync(framePath, frames[i]);
    }

    const framesTime = Date.now() - framesStartTime;
    console.log(`   ✅ Frames generated in ${(framesTime / 1000).toFixed(1)}s`);
    console.log('');

    // ======================
    // STEP 3: Convert to MP4 with FFmpeg
    // ======================
    console.log('🎥 [3/3] Converting to MP4 with FFmpeg...');
    const mp4Path = join(outputDir, `daisy-${dateStr}-genesis.mp4`);

    const ffmpegSuccess = await runFFmpeg(framesDir, mp4Path);

    if (ffmpegSuccess) {
      console.log('   ✅ MP4 created successfully');

      // Clean up frames
      console.log('   🧹 Cleaning up temporary frames...');
      rmSync(framesDir, { recursive: true, force: true });
      console.log('   ✅ Cleanup complete');
    } else {
      console.log(
        '   ⚠️  FFmpeg not available. Frames saved for manual conversion.'
      );
      console.log('');
      console.log('   To convert manually, run:');
      console.log(
        `   ffmpeg -framerate 30 -i "${framesDir}\\frame-%04d.png" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p "${mp4Path}"`
      );
    }

    console.log('');
    console.log('━'.repeat(60));
    console.log('✨ Generation Complete!');
    console.log('');
    console.log('📦 Final Assets:');
    console.log(`   📄 PNG: ${pngPath}`);
    console.log(`      Size: ${formatBytes(staticResult.staticImage.length)}`);
    if (ffmpegSuccess) {
      console.log(`   🎬 MP4: ${mp4Path}`);
    }
    console.log('');
    console.log('⏱️  Total Time:');
    console.log(`   PNG: ${(pngTime / 1000).toFixed(1)}s`);
    console.log(`   Frames: ${(framesTime / 1000).toFixed(1)}s`);
    console.log(
      `   Total: ${((Date.now() - pngStartTime) / 1000).toFixed(1)}s`
    );

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

/**
 * Run FFmpeg to convert frames to MP4
 */
function runFFmpeg(framesDir: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const inputPattern = join(framesDir, 'frame-%04d.png');

    const ffmpeg = spawn('ffmpeg', [
      '-framerate',
      '30',
      '-i',
      inputPattern,
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-y', // Overwrite output file
      outputPath,
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      // Show progress from ffmpeg
      const match = stderr.match(/frame=\s*(\d+)/);
      if (match) {
        process.stdout.write(`\r   Encoding: frame ${match[1]}/900`);
      }
    });

    ffmpeg.on('close', (code) => {
      console.log(''); // New line after progress
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    ffmpeg.on('error', (error) => {
      // FFmpeg not installed
      resolve(false);
    });
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

main();
