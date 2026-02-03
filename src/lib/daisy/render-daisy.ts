// src/lib/daisy/render-daisy.ts

import { createCanvas, type CanvasRenderingContext2D } from 'canvas';
import {
  DAILY_THEMES,
  type DailyArtSession,
  type DailyTheme,
} from '@/components/daily-art/types';
import { createRandom } from '@/components/daily-art/utils';

const CANVAS_SIZE = 2048;

interface RenderResult {
  staticImage: Buffer; // PNG
}

/**
 * Get the theme for a specific date string (YYYY-MM-DD format)
 * Uses a deterministic selection based on day of year
 */
function getDailyTheme(dateString: string): DailyTheme {
  const date = new Date(dateString + 'T00:00:00Z');
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  const year = date.getUTCFullYear();
  const themeIndex = (dayOfYear + year * 7) % DAILY_THEMES.length;
  return DAILY_THEMES[themeIndex];
}

/**
 * Render a Daisy visualization for a specific date
 * Server-side version using node-canvas
 */
export async function renderDaisyVisualization(
  sessions: DailyArtSession[],
  date: string
): Promise<RenderResult> {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');

  // Get theme for the date
  const theme = getDailyTheme(date);

  // Draw background
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Calculate positions for all daisies
  const allPositions = calculateDaisyPositions(sessions, CANVAS_SIZE, date);

  // Render all daisies
  for (const pos of allPositions) {
    renderDaisy(ctx, pos, theme);
  }

  const staticImage = canvas.toBuffer('image/png');

  return { staticImage };
}

interface DaisyPosition {
  x: number;
  y: number;
  size: number;
  rotation: number;
  colorIndex: number;
}

function calculateDaisyPositions(
  sessions: DailyArtSession[],
  canvasSize: number,
  date: string
): DaisyPosition[] {
  const positions: DaisyPosition[] = [];
  const random = createRandom(hashString(date));

  // Background daisies (300)
  const bgCount = 300;
  for (let i = 0; i < bgCount; i++) {
    positions.push({
      x: random() * canvasSize,
      y: random() * canvasSize,
      size: 40 + random() * 60,
      rotation: random() * Math.PI * 2,
      colorIndex: Math.floor(random() * 8),
    });
  }

  // Session daisies (along trail paths)
  for (const session of sessions) {
    if (!session.trailData || session.trailData.length < 2) continue;
    const trailPositions = calculateTrailPositions(session, canvasSize, random);
    positions.push(...trailPositions);
  }

  return positions;
}

function calculateTrailPositions(
  session: DailyArtSession,
  canvasSize: number,
  random: () => number
): DaisyPosition[] {
  const positions: DaisyPosition[] = [];
  const { trailData, duration } = session;

  const count = Math.min(80, Math.max(15, Math.floor(duration * 2)));

  // Find bounds
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of trailData) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const margin = canvasSize * 0.06;
  const usableSize = canvasSize - margin * 2;
  const baseSize = canvasSize * 0.08;

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const pointIndex = Math.floor(t * (trailData.length - 1));
    const point = trailData[pointIndex];

    const x = margin + ((point.x - minX) / rangeX) * usableSize;
    const y = margin + ((point.y - minY) / rangeY) * usableSize;

    positions.push({
      x,
      y,
      size: baseSize * (0.8 + random() * 0.4),
      rotation: random() * Math.PI * 2,
      colorIndex: Math.floor(random() * 8),
    });
  }

  return positions;
}

function renderDaisy(
  ctx: CanvasRenderingContext2D,
  pos: DaisyPosition,
  theme: DailyTheme
): void {
  const { x, y, size, rotation, colorIndex } = pos;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const petalColor = theme.petalColors[colorIndex % theme.petalColors.length];
  const centerColor = theme.centerColors[0];

  // Draw 8 petals
  const petalCount = 8;
  const petalLength = size * 0.45;
  const petalWidth = size * 0.15;

  ctx.fillStyle = petalColor;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -petalLength * 0.6, petalWidth, petalLength, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Draw center
  const centerRadius = size * 0.15;
  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
