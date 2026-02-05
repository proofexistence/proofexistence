#!/usr/bin/env tsx

/**
 * Test different stroke colors for Genesis Edition
 */

import { db } from '../src/db';
import { sessions, users } from '../src/db/schema';
import { between, sql } from 'drizzle-orm';
import { renderDaisyVisualization } from '../src/lib/daisy/render-daisy';
import type { DailyArtSession } from '../src/components/daily-art/types';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Test different colors
const TEST_COLORS = [
  { name: 'white', code: '#FFFFFF', desc: '白色（高對比）' },
  { name: 'deep-gold', code: '#B8860B', desc: '深金色' },
  { name: 'orange-gold', code: '#FF8C00', desc: '橙金色' },
  { name: 'silver', code: '#C0C0C0', desc: '銀色' },
  { name: 'bronze', code: '#CD7F32', desc: '青銅色' },
];

async function main() {
  const dateStr = '2026-01-26';

  console.log('🎨 Testing Stroke Colors for Genesis Edition');
  console.log('━'.repeat(60));

  // Fetch sessions
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

  const outputDir = join(process.cwd(), 'temp', 'stroke-test');
  mkdirSync(outputDir, { recursive: true });

  console.log(`\n📊 Found ${validSessions.length} sessions\n`);

  const { renderDaisyVisualization } =
    await import('../src/lib/daisy/render-daisy');

  // Generate with black (standard) first
  console.log('⚫ Generating Standard (Black stroke)...');
  const standardResult = await renderDaisyVisualization(
    validSessions,
    dateStr,
    {
      edition: 'standard',
    }
  );
  const standardPath = join(outputDir, 'standard-black.png');
  writeFileSync(standardPath, standardResult.staticImage);
  const standardSizeKB = (standardResult.staticImage.length / 1024).toFixed(2);
  console.log(`   ✅ Saved: ${standardPath} (${standardSizeKB} KB)\n`);

  // Generate with each test color for Genesis
  for (const color of TEST_COLORS) {
    console.log(`🎨 Generating with ${color.desc} (${color.code})...`);
    const result = await renderDaisyVisualization(validSessions, dateStr, {
      edition: 'genesis',
      strokeColor: color.code,
      useGlow: true,
    });
    const filePath = join(outputDir, `genesis-${color.name}.png`);
    writeFileSync(filePath, result.staticImage);
    const sizeKB = (result.staticImage.length / 1024).toFixed(2);
    console.log(`   ✅ Saved: ${filePath} (${sizeKB} KB)\n`);
  }

  console.log('\n━'.repeat(60));
  console.log('✨ Test complete! Compare images in:');
  console.log(`   ${outputDir}`);
  console.log('\n📁 Generated files:');
  console.log('   - standard-black.png (原始黑色描邊)');
  for (const color of TEST_COLORS) {
    console.log(`   - genesis-${color.name}.png (${color.desc})`);
  }

  process.exit(0);
}

main();
