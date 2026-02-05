// src/lib/daisy/render-animation.ts
// Genesis Edition: 60-second bloom animation

import { createCanvas, loadImage, type CanvasRenderingContext2D } from 'canvas';
import {
  DAILY_THEMES,
  type DailyArtSession,
  type DailyTheme,
} from '@/components/daily-art/types';
import { createRandom } from '@/components/daily-art/utils';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const CANVAS_SIZE = 2048;
const DAISY_COUNT = 12;
const ANIMATION_DURATION = 30; // 30 seconds
const FPS = 30; // 30 frames per second
const TOTAL_FRAMES = ANIMATION_DURATION * FPS; // 900 frames

interface DaisyPosition {
  x: number;
  y: number;
  size: number;
  rotation: number;
  colorIndex: number;
  svgIndex: number;
  petalColors: string[];
  centerColor: string;
  spawnFrame: number; // When this daisy appears
  growthDuration: number; // How many frames to fully bloom
}

/**
 * Load all daisy SVG files
 */
function loadDaisySVGs(): string[] {
  const svgs: string[] = [];
  const publicDir = join(process.cwd(), 'public', 'daisies');

  for (let i = 1; i <= DAISY_COUNT; i++) {
    const num = i.toString().padStart(2, '0');
    const svgPath = join(publicDir, `daisy_${num}.svg`);
    const svg = readFileSync(svgPath, 'utf-8');
    svgs.push(svg);
  }

  return svgs;
}

/**
 * Colorize SVG - Genesis Edition uses golden stroke
 */
function colorizeSVG(
  svgString: string,
  petalColors: string[],
  centerColor: string,
  strokeColor: string = '#FFD700' // Golden stroke for Genesis Edition
): string {
  let svg = svgString.replace(/<rect[^>]*fill="#C0C0C0"[^>]*\/>/, '');
  svg = svg.replace(/<svg([^>]*)>/, '<svg$1 width="200" height="200">');

  const petalRegex = /(<(?:ellipse|rect)[^>]*)(fill="#FFFFFF")([^>]*)(\/?>)/g;
  let petalIndex = 0;

  svg = svg.replace(petalRegex, (match, before, fill, after, closing) => {
    const color = petalColors[petalIndex % petalColors.length];
    petalIndex++;
    return `${before}fill="${color}" stroke="${strokeColor}" stroke-width="1.5"${after}${closing}`;
  });

  svg = svg.replace(
    /(<(?:ellipse|circle)[^>]*)(fill="#F5A623")([^>]*)(\/?>)/g,
    `$1fill="${centerColor}" stroke="${strokeColor}" stroke-width="1.5"$3$4`
  );

  svg = svg.replace(
    /(<(?:ellipse|circle)[^>]*)(fill="#C0C0C0")([^>]*)(\/?>)/g,
    `$1fill="${darkenColor(centerColor, 0.2)}" stroke="${strokeColor}" stroke-width="1"$3$4`
  );

  return svg;
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Get day of year (1-366) - matches frontend utils.ts
 */
function getDayOfYear(date: Date): number {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getDailyTheme(dateString: string): DailyTheme {
  const date = new Date(dateString + 'T00:00:00Z');
  const dayOfYear = getDayOfYear(date);
  const year = date.getUTCFullYear();
  const themeIndex = (dayOfYear + year * 7) % DAILY_THEMES.length;
  return DAILY_THEMES[themeIndex];
}

/**
 * Calculate day seed - matches frontend daily-art-canvas.tsx
 */
function calculateDaySeed(dateString: string): number {
  const date = new Date(dateString + 'T00:00:00Z');
  const dayOfYear = getDayOfYear(date);
  const year = date.getUTCFullYear();
  return (year * 1000 + dayOfYear) * 12345;
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

/**
 * Calculate daisy positions with spawn timing
 * This generates the same final positions as the static image,
 * but adds animation timing information.
 */
function calculateAnimatedDaisyPositions(
  sessions: DailyArtSession[],
  canvasSize: number,
  date: string
): DaisyPosition[] {
  const theme = getDailyTheme(date);
  const candyPalette = theme.petalColors;
  const centerColors = theme.centerColors;
  const daySeed = calculateDaySeed(date);

  // Track existing positions for collision detection
  const existingPositions: { x: number; y: number; size: number }[] = [];

  // Sort sessions by createdAt (match frontend and static render)
  const sortedSessions = [...sessions].sort((a, b) => {
    const timeDiff =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  // STEP 1: Pre-calculate ALL trail flowers (same as static render)
  const allSessionTrails: {
    positions: Omit<DaisyPosition, 'spawnFrame' | 'growthDuration'>[];
    session: DailyArtSession;
  }[] = [];

  for (const session of sortedSessions) {
    if (!session.trailData || session.trailData.length < 2) {
      allSessionTrails.push({ positions: [], session });
      continue;
    }

    const trailPositions = calculateTrailPositionsStatic(
      session,
      canvasSize,
      candyPalette,
      centerColors,
      existingPositions
    );

    for (const pos of trailPositions) {
      existingPositions.push({ x: pos.x, y: pos.y, size: pos.size });
    }

    allSessionTrails.push({ positions: trailPositions, session });
  }

  // STEP 2: Generate background fill positions (same as static render)
  const FILL_FLOWER_COUNT = 500;
  const POSITION_SPACING = 70;

  const bgPositions = generateBackgroundPositions(
    canvasSize,
    FILL_FLOWER_COUNT,
    POSITION_SPACING,
    daySeed + 9999
  );

  // Filter valid positions (same collision detection as static)
  const fillBaseSize = canvasSize * 0.07;
  const FILL_COLLISION_THRESHOLD = 0.75;
  const validFillPositions: { x: number; y: number; size: number }[] = [];

  let fillIdx = 0;
  for (const pos of bgPositions) {
    const sizeCategory = (fillIdx * 777) % 100;
    let sizeMult: number;
    if (sizeCategory < 40) {
      sizeMult = 0.7 + ((fillIdx * 123) % 15) / 100;
    } else if (sizeCategory < 80) {
      sizeMult = 0.85 + ((fillIdx * 456) % 20) / 100;
    } else {
      sizeMult = 1.05 + ((fillIdx * 789) % 15) / 100;
    }
    const flowerSize = fillBaseSize * sizeMult;
    const radius = flowerSize / 2;

    let tooClose = false;
    for (const existing of existingPositions) {
      const dx = pos.x - existing.x;
      const dy = pos.y - existing.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = radius + existing.size / 2;
      if (dist < minDist * FILL_COLLISION_THRESHOLD) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      validFillPositions.push({ ...pos, size: flowerSize });
      existingPositions.push({ ...pos, size: flowerSize });
    }
    fillIdx++;
  }

  // STEP 3: Build queue and assign spawn timing
  type QueueItem =
    | {
        type: 'trail';
        data: Omit<DaisyPosition, 'spawnFrame' | 'growthDuration'>;
      }
    | { type: 'fill'; data: { x: number; y: number; size: number } };
  const flowerQueue: QueueItem[] = [];

  const fillPerSession = Math.floor(
    validFillPositions.length / (sortedSessions.length + 1)
  );
  let validFillIdx = 0;

  // Initial batch of background
  for (
    let i = 0;
    i < fillPerSession && validFillIdx < validFillPositions.length;
    i++
  ) {
    flowerQueue.push({ type: 'fill', data: validFillPositions[validFillIdx] });
    validFillIdx++;
  }

  // Interleave trails and fills
  allSessionTrails.forEach((sessionData) => {
    for (const trail of sessionData.positions) {
      flowerQueue.push({ type: 'trail', data: trail });
    }

    for (
      let i = 0;
      i < fillPerSession && validFillIdx < validFillPositions.length;
      i++
    ) {
      flowerQueue.push({
        type: 'fill',
        data: validFillPositions[validFillIdx],
      });
      validFillIdx++;
    }
  });

  // Remaining fills
  while (validFillIdx < validFillPositions.length) {
    flowerQueue.push({ type: 'fill', data: validFillPositions[validFillIdx] });
    validFillIdx++;
  }

  // STEP 4: Assign spawn timing and create final positions
  const positions: DaisyPosition[] = [];
  const spawnInterval = TOTAL_FRAMES / Math.max(1, flowerQueue.length);

  for (let queueIdx = 0; queueIdx < flowerQueue.length; queueIdx++) {
    const item = flowerQueue[queueIdx];
    const spawnFrame = Math.floor(queueIdx * spawnInterval);
    const growthDuration = 20 + Math.floor(Math.random() * 40); // 0.7-2s

    if (item.type === 'trail') {
      positions.push({
        ...item.data,
        spawnFrame,
        growthDuration,
      });
    } else {
      // Generate fill properties using queue index
      const pos = item.data;
      const seedVal = daySeed + queueIdx * 777;
      const localRandom = createRandom(seedVal);

      const centerColor =
        centerColors[Math.floor(localRandom() * centerColors.length)];
      const svgIndex = Math.floor(localRandom() * DAISY_COUNT);

      const useMultiColor = localRandom() > 0.3;
      const petalCount = 16;
      const petalColors: string[] = [];

      if (useMultiColor) {
        for (let j = 0; j < petalCount; j++) {
          const colorIdx = Math.floor(localRandom() * candyPalette.length);
          petalColors.push(candyPalette[colorIdx]);
        }
      } else {
        const colorIdx = Math.floor(localRandom() * candyPalette.length);
        const color = candyPalette[colorIdx];
        for (let j = 0; j < petalCount; j++) {
          petalColors.push(color);
        }
      }

      positions.push({
        x: pos.x,
        y: pos.y,
        size: pos.size,
        rotation: localRandom() * Math.PI * 2,
        colorIndex: Math.floor(localRandom() * 8),
        svgIndex,
        petalColors,
        centerColor,
        spawnFrame,
        growthDuration,
      });
    }
  }

  return positions;
}

/**
 * Generate background positions using Poisson disk sampling
 */
function generateBackgroundPositions(
  canvasSize: number,
  count: number,
  minDistance: number,
  seed: number
): { x: number; y: number }[] {
  const random = createRandom(seed);
  const positions: { x: number; y: number }[] = [];
  const margin = canvasSize * 0.02;
  const maxAttempts = count * 10;

  let attempts = 0;
  while (positions.length < count && attempts < maxAttempts) {
    const x = margin + random() * (canvasSize - margin * 2);
    const y = margin + random() * (canvasSize - margin * 2);

    if (!isTooClose(x, y, positions, minDistance)) {
      positions.push({ x, y });
    }
    attempts++;
  }

  return positions;
}

function isTooClose(
  x: number,
  y: number,
  existingPositions: { x: number; y: number }[],
  minDistance: number
): boolean {
  for (const pos of existingPositions) {
    const dx = x - pos.x;
    const dy = y - pos.y;
    if (dx * dx + dy * dy < minDistance * minDistance) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate trail positions (without animation timing)
 */
function calculateTrailPositionsStatic(
  session: DailyArtSession,
  canvasSize: number,
  candyPalette: readonly string[],
  centerColors: readonly string[],
  existingPositions: { x: number; y: number; size: number }[]
): Omit<DaisyPosition, 'spawnFrame' | 'growthDuration'>[] {
  const positions: Omit<DaisyPosition, 'spawnFrame' | 'growthDuration'>[] = [];
  const { trailData, duration } = session;

  if (!trailData || trailData.length < 2) return [];

  const sessionSeed = hashString(session.id);
  const sessionRandom = createRandom(sessionSeed);

  const sessionCenterColor =
    centerColors[Math.floor(sessionRandom() * centerColors.length)];

  const colorIdx = Math.floor(sessionRandom() * candyPalette.length);
  const sessionColor = candyPalette[colorIdx];

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
  const baseSize = canvasSize * 0.1;

  let totalLength = 0;
  const segmentLengths: number[] = [0];

  for (let i = 1; i < trailData.length; i++) {
    const dx = trailData[i].x - trailData[i - 1].x;
    const dy = trailData[i].y - trailData[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(totalLength);
  }

  const localPositions: { x: number; y: number; size: number }[] = [];
  const SAME_SESSION_THRESHOLD = 0.6;
  const OTHER_SESSION_THRESHOLD = 0.8;
  const daisyCount = Math.min(120, Math.max(25, Math.floor(duration * 2.5)));

  for (let i = 0; i < daisyCount; i++) {
    const targetDist = (i / Math.max(1, daisyCount - 1)) * totalLength;

    let segIdx = 0;
    for (let j = 1; j < segmentLengths.length; j++) {
      if (segmentLengths[j] >= targetDist) {
        segIdx = j - 1;
        break;
      }
      segIdx = j - 1;
    }

    const segStart = segmentLengths[segIdx];
    const segEnd = segmentLengths[segIdx + 1] || segStart;
    const segLength = segEnd - segStart;
    const t = segLength > 0 ? (targetDist - segStart) / segLength : 0;

    const p0 = trailData[segIdx];
    const p1 = trailData[Math.min(segIdx + 1, trailData.length - 1)];

    const rawX = p0.x + (p1.x - p0.x) * t;
    const rawY = p0.y + (p1.y - p0.y) * t;

    let x = margin + ((rawX - minX) / rangeX) * usableSize;
    let y = margin + ((rawY - minY) / rangeY) * usableSize;

    x += (sessionRandom() - 0.5) * baseSize * 0.1;
    y += (sessionRandom() - 0.5) * baseSize * 0.1;

    const sizeVar = 0.85 + sessionRandom() * 0.3;
    const maxSize = baseSize * sizeVar;
    const radius = maxSize / 2;

    const svgIndex = Math.floor(sessionRandom() * DAISY_COUNT);

    let tooCloseToOther = false;
    for (const pos of existingPositions) {
      const dx = x - pos.x;
      const dy = y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = radius + pos.size / 2;

      if (dist < minDist * OTHER_SESSION_THRESHOLD) {
        tooCloseToOther = true;
        break;
      }
    }

    let tooCloseToLocal = false;
    for (const pos of localPositions) {
      const dx = x - pos.x;
      const dy = y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = radius + pos.size / 2;

      if (dist < minDist * SAME_SESSION_THRESHOLD) {
        tooCloseToLocal = true;
        break;
      }
    }

    if (tooCloseToOther || tooCloseToLocal) {
      continue;
    }

    localPositions.push({ x, y, size: maxSize });

    const petalColors: string[] = [];
    for (let j = 0; j < 16; j++) {
      petalColors.push(sessionColor);
    }

    positions.push({
      x,
      y,
      size: maxSize,
      rotation: sessionRandom() * Math.PI * 2,
      colorIndex: Math.floor(sessionRandom() * 8),
      svgIndex,
      petalColors,
      centerColor: sessionCenterColor,
    });
  }

  return positions;
}

/**
 * Render a single frame of the animation
 */
async function renderAnimationFrame(
  frameNumber: number,
  allPositions: DaisyPosition[],
  theme: DailyTheme,
  svgs: string[]
): Promise<Buffer> {
  const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Render visible daisies with growth animation
  for (const pos of allPositions) {
    if (frameNumber < pos.spawnFrame) continue; // Not spawned yet

    const age = frameNumber - pos.spawnFrame;
    const growthProgress = Math.min(1, age / pos.growthDuration);

    // Eased growth (ease-out cubic)
    const easedProgress = 1 - Math.pow(1 - growthProgress, 3);

    // Calculate current size and opacity
    const currentSize = pos.size * easedProgress;
    const currentOpacity = Math.min(1, growthProgress * 2); // Fade in quickly

    if (currentSize > 0 && currentOpacity > 0) {
      await renderDaisy(ctx, pos, currentSize, currentOpacity, svgs);
    }
  }

  // Optimize PNG
  const rawPng = canvas.toBuffer('image/png');
  const optimizedPng = await sharp(rawPng)
    .png({ compressionLevel: 9, quality: 85, effort: 5 })
    .toBuffer();

  return optimizedPng;
}

async function renderDaisy(
  ctx: CanvasRenderingContext2D,
  pos: DaisyPosition,
  size: number,
  opacity: number,
  svgs: string[]
): Promise<void> {
  const { x, y, rotation, svgIndex, petalColors, centerColor } = pos;

  const svg = svgs[svgIndex % svgs.length];
  const colorizedSvg = colorizeSVG(svg, petalColors, centerColor);
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(colorizedSvg).toString('base64')}`;

  try {
    const image = await loadImage(svgDataUrl);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.rotate(rotation);

    const halfSize = size / 2;
    ctx.drawImage(image, -halfSize, -halfSize, size, size);

    ctx.restore();
  } catch {
    // Silently skip on error
  }
}

/**
 * Generate all frames for Genesis animation
 * Returns all frames for 30-second animation at 30fps = 900 frames
 */
export async function generateGenesisAnimation(
  sessions: DailyArtSession[],
  date: string,
  onProgress?: (frame: number, total: number) => void
): Promise<Buffer[]> {
  const theme = getDailyTheme(date);
  const svgs = loadDaisySVGs();
  const allPositions = calculateAnimatedDaisyPositions(
    sessions,
    CANVAS_SIZE,
    date
  );

  // 30 seconds @ 30fps = 900 frames
  const frames: Buffer[] = [];

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const frameBuffer = await renderAnimationFrame(
      i,
      allPositions,
      theme,
      svgs
    );
    frames.push(frameBuffer);

    if (onProgress) {
      onProgress(i, TOTAL_FRAMES);
    }
  }

  return frames;
}
