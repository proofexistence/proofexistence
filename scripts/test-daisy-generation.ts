#!/usr/bin/env tsx

/**
 * Test script for Daisy NFT generation
 *
 * Usage:
 *   bun run scripts/test-daisy-generation.ts [date]
 *   bun run scripts/test-daisy-generation.ts 2026-02-01
 *
 * Generates Genesis and Standard edition images and saves them locally.
 */

import { db } from '../src/db';
import { sessions, users } from '../src/db/schema';
import { between, sql } from 'drizzle-orm';
import { renderDaisyVisualization } from '../src/lib/daisy/render-daisy';
import type { DailyArtSession } from '../src/components/daily-art/types';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  const args = process.argv.slice(2);
  let dateStr: string;

  if (args.length > 0) {
    dateStr = args[0];
  } else {
    // Default to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dateStr = yesterday.toISOString().split('T')[0];
  }

  console.log('🌼 Daisy NFT Generation Test');
  console.log('━'.repeat(50));
  console.log(`📅 Date: ${dateStr}`);
  console.log('');

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.error('❌ Invalid date format. Use YYYY-MM-DD');
    process.exit(1);
  }

  try {
    // Fetch sessions from target date
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
      console.log('');
      console.log(
        '💡 Try using a date with existing data, or create some sessions first.'
      );
      process.exit(0);
    }

    // Process sessions
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

    // Get unique participants
    const participantIds = new Set(sessionsData.map((s) => s.userId));
    console.log(`   Unique participants: ${participantIds.size}`);
    console.log('');

    // Create output directory
    const outputDir = join(process.cwd(), 'temp', 'daisy-test');
    mkdirSync(outputDir, { recursive: true });

    // Generate Genesis Edition
    console.log('🎨 Generating Genesis Edition (1/1)...');
    const startGenesis = Date.now();
    const genesisResult = await renderDaisyVisualization(
      validSessions,
      dateStr,
      { edition: 'genesis' }
    );
    const genesisTime = Date.now() - startGenesis;

    const genesisPath = join(outputDir, `daisy-${dateStr}-genesis.png`);
    writeFileSync(genesisPath, genesisResult.staticImage);

    console.log(`   ✅ Generated in ${genesisTime}ms`);
    console.log(`   📁 Size: ${formatBytes(genesisResult.staticImage.length)}`);
    console.log(`   💾 Saved to: ${genesisPath}`);
    console.log('');

    // Generate Standard Edition
    console.log('🎨 Generating Standard Edition...');
    const startStandard = Date.now();
    const standardResult = await renderDaisyVisualization(
      validSessions,
      dateStr,
      { edition: 'standard' }
    );
    const standardTime = Date.now() - startStandard;

    const standardPath = join(outputDir, `daisy-${dateStr}-standard.png`);
    writeFileSync(standardPath, standardResult.staticImage);

    console.log(`   ✅ Generated in ${standardTime}ms`);
    console.log(
      `   📁 Size: ${formatBytes(standardResult.staticImage.length)}`
    );
    console.log(`   💾 Saved to: ${standardPath}`);
    console.log('');

    // Summary
    console.log('━'.repeat(50));
    console.log('✨ Generation Complete!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Sessions: ${validSessions.length}`);
    console.log(`   Participants: ${participantIds.size}`);
    console.log(
      `   Genesis size: ${formatBytes(genesisResult.staticImage.length)}`
    );
    console.log(
      `   Standard size: ${formatBytes(standardResult.staticImage.length)}`
    );
    console.log(`   Total time: ${genesisTime + standardTime}ms`);
    console.log('');
    console.log('🖼️  Images saved to:');
    console.log(`   ${outputDir}`);

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
