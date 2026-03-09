import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const files = [
  'light-trail-1', 'light-trail-2',
  'proof-standard', 'proof-pol', 'proof-time26',
  'cosmos-1', 'cosmos-2',
  'profile', 'badges', 'leaderboard', 'daisy'
];

const dir = join(import.meta.dirname, '..', 'public', 'screenshots');
mkdirSync(dir, { recursive: true });

for (const name of files) {
  const canvas = createCanvas(1920, 1080);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, 1920, 1080);

  // Border
  ctx.strokeStyle = '#0CC9F2';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 1880, 1040);

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), 960, 500);

  // Subtitle
  ctx.fillStyle = '#94A3B8';
  ctx.font = '24px sans-serif';
  ctx.fillText('Replace with actual screenshot', 960, 560);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(dir, `${name}.png`), buffer);
  console.log(`Created: ${name}.png`);
}
