import { createRandom } from './utils';

const TAU = Math.PI * 2;
const DAISY_COUNT = 12;

// Cache for loaded SVG strings
let svgCache: string[] | null = null;

/**
 * Load all daisy SVG files
 */
export async function loadDaisySVGs(): Promise<string[]> {
  if (svgCache) return svgCache;

  const svgs: string[] = [];
  for (let i = 1; i <= DAISY_COUNT; i++) {
    const num = i.toString().padStart(2, '0');
    const response = await fetch(`/daisies/daisy_${num}.svg`);
    const text = await response.text();
    svgs.push(text);
  }
  svgCache = svgs;
  return svgs;
}

/**
 * Modify SVG to apply candy colors to petals with black outline
 */
function colorizeSVG(
  svgString: string,
  petalColors: string[],
  centerColor: string
): string {
  // Remove background rect
  let svg = svgString.replace(/<rect[^>]*fill="#C0C0C0"[^>]*\/>/, '');

  // Find all petal elements (ellipse or rect with white fill) and add stroke
  const petalRegex = /(<(?:ellipse|rect)[^>]*)(fill="#FFFFFF")([^>]*)(\/?>)/g;
  let petalIndex = 0;

  svg = svg.replace(petalRegex, (match, before, fill, after, closing) => {
    const color = petalColors[petalIndex % petalColors.length];
    petalIndex++;
    // Add thin black stroke for outline effect
    return `${before}fill="${color}" stroke="#1a1a1a" stroke-width="1.5"${after}${closing}`;
  });

  // Replace center color (orange #F5A623) with stroke
  svg = svg.replace(
    /(<(?:ellipse|circle)[^>]*)(fill="#F5A623")([^>]*)(\/?>)/g,
    `$1fill="${centerColor}" stroke="#1a1a1a" stroke-width="1.5"$3$4`
  );

  // Replace gray circles (#C0C0C0) with darker center color and stroke
  svg = svg.replace(
    /(<(?:ellipse|circle)[^>]*)(fill="#C0C0C0")([^>]*)(\/?>)/g,
    `$1fill="${darkenColor(centerColor, 0.2)}" stroke="#1a1a1a" stroke-width="1"$3$4`
  );

  return svg;
}

/**
 * Darken a hex color
 */
function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.floor(((num >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0xff) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Create an Image from SVG string
 */
function svgToImage(svgString: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * SVG-based Daisy class
 */
export class Daisy {
  x: number;
  y: number;
  size: number;
  maxSize: number;
  image: HTMLImageElement | null = null;
  rotation: number;
  random: () => number;
  seed: number;
  isComplete: boolean;
  opacity: number;
  t: number;
  delay: number;
  isBackground: boolean;

  // For creating the image
  svgIndex: number;
  petalColors: string[];
  centerColor: string;
  imageReady: boolean = false;

  constructor(
    x: number,
    y: number,
    maxSize: number,
    candyPalette: readonly string[],
    centerColor: string,
    seed: number,
    isBackground: boolean = false,
    delay: number = 0,
    svgIndex: number = 0
  ) {
    this.x = x;
    this.y = y;
    this.maxSize = maxSize;
    this.centerColor = centerColor;
    this.seed = seed;
    this.random = createRandom(seed);
    this.isBackground = isBackground;
    this.delay = delay;
    this.svgIndex = svgIndex;

    this.rotation = this.random() * TAU;

    // Generate petal colors (8-16 petals depending on SVG)
    this.petalColors = [];
    const useMultiColor = this.random() > 0.3; // 70% chance multi-color
    const petalCount = 16; // Max petals in SVGs

    if (useMultiColor) {
      for (let i = 0; i < petalCount; i++) {
        const colorIdx = Math.floor(this.random() * candyPalette.length);
        this.petalColors.push(candyPalette[colorIdx]);
      }
    } else {
      const colorIdx = Math.floor(this.random() * candyPalette.length);
      const color = candyPalette[colorIdx];
      for (let i = 0; i < petalCount; i++) {
        this.petalColors.push(color);
      }
    }

    // Background flowers start fully bloomed
    if (isBackground) {
      this.size = maxSize;
      this.opacity = 0.7 + this.random() * 0.3;
      this.isComplete = true;
      this.t = 100;
    } else {
      this.size = 0;
      this.opacity = 0;
      this.isComplete = false;
      this.t = -delay;
    }
  }

  /**
   * Initialize the image from SVG
   */
  async initImage(svgs: string[]) {
    if (this.imageReady) return;

    const svg = svgs[this.svgIndex % svgs.length];
    const colorizedSvg = colorizeSVG(svg, this.petalColors, this.centerColor);
    this.image = await svgToImage(colorizedSvg);
    this.imageReady = true;
  }

  /**
   * Update and render the daisy
   */
  run(ctx: CanvasRenderingContext2D) {
    this.t++;

    // Wait for delay
    if (this.t < 0) return;

    // Fade in
    if (this.opacity < 1 && !this.isBackground) {
      this.opacity = Math.min(1, this.opacity + 0.05);
    }

    // Grow size with easing
    if (this.size < this.maxSize && !this.isBackground) {
      const growthSpeed = this.maxSize * 0.03;
      this.size += growthSpeed * (1.1 - this.size / this.maxSize);
      if (this.size >= this.maxSize * 0.98) {
        this.size = this.maxSize;
        this.isComplete = true;
      }
    }

    this.show(ctx);
  }

  /**
   * Render the daisy
   */
  show(ctx: CanvasRenderingContext2D) {
    if (this.size <= 1 || !this.image) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw centered
    const halfSize = this.size / 2;
    ctx.drawImage(this.image, -halfSize, -halfSize, this.size, this.size);

    ctx.restore();
  }

  isDone(): boolean {
    return this.isComplete && this.opacity >= 0.95;
  }
}

/**
 * Create background daisies (fill the canvas)
 */
export function createBackgroundDaisies(
  positions: { x: number; y: number }[],
  candyPalette: readonly string[],
  centerColors: readonly string[],
  baseSize: number,
  seed: number
): Daisy[] {
  const daisies: Daisy[] = [];
  const random = createRandom(seed);

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const sizeVar = 0.5 + random() * 0.6; // 0.5-1.1x
    const size = baseSize * sizeVar;
    const centerColor =
      centerColors[Math.floor(random() * centerColors.length)];
    const svgIndex = Math.floor(random() * DAISY_COUNT);

    daisies.push(
      new Daisy(
        pos.x,
        pos.y,
        size,
        candyPalette,
        centerColor,
        seed + i * 123,
        true,
        0,
        svgIndex
      )
    );
  }

  return daisies;
}

/**
 * Pending daisy spawn info - for queuing daisies to spawn one by one
 */
export interface PendingDaisy {
  x: number;
  y: number;
  maxSize: number;
  candyPalette: readonly string[];
  centerColor: string;
  seed: number;
  svgIndex: number;
}

/**
 * Hash a string to a number (for deterministic seeding)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Calculate trail daisy positions for a session (without creating daisies yet)
 * Creates a line of flowers along the trail path - close but not overlapping
 * Uses sessionId for deterministic positioning (consistent across renders)
 */
export function calculateTrailDaisyPositions(
  trailData: { x: number; y: number }[],
  duration: number,
  candyPalette: readonly string[],
  centerColors: readonly string[],
  canvasSize: number,
  sessionId: string, // Use session ID for consistent seed
  existingPositions: { x: number; y: number; size: number }[]
): PendingDaisy[] {
  if (!trailData || trailData.length < 2) return [];

  const pending: PendingDaisy[] = [];
  // Use session ID hash for deterministic random - same session always gets same flowers
  const sessionSeed = hashString(sessionId);
  const random = createRandom(sessionSeed);

  // Session-wide consistent center color for cohesion
  const sessionCenterColor =
    centerColors[Math.floor(random() * centerColors.length)];

  // Single consistent petal color for the whole trail (makes sessions distinguishable)
  const colorIdx = Math.floor(random() * candyPalette.length);
  const sessionColor = candyPalette[colorIdx];

  // Find bounds for normalization
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
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

  // Trail flower size - Murakami style: prominent, uniform-ish
  const baseSize = canvasSize * 0.1;

  // Calculate total path length for even distribution
  let totalLength = 0;
  const segmentLengths: number[] = [0];

  for (let i = 1; i < trailData.length; i++) {
    const dx = trailData[i].x - trailData[i - 1].x;
    const dy = trailData[i].y - trailData[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(totalLength);
  }

  // Local positions for this session (to check collision within same session)
  const localPositions: { x: number; y: number; size: number }[] = [];

  // Dense but organized: flowers touch edges but don't heavily overlap
  const SAME_SESSION_THRESHOLD = 0.6; // 40% overlap within session (continuous line)
  const OTHER_SESSION_THRESHOLD = 0.8; // 20% overlap between sessions (distinct trails)

  // Moderate flower count
  const daisyCount = Math.min(120, Math.max(25, Math.floor(duration * 2.5)));

  // Place flowers evenly along the path
  for (let i = 0; i < daisyCount; i++) {
    const targetDist = (i / Math.max(1, daisyCount - 1)) * totalLength;

    // Find the segment containing this distance
    let segIdx = 0;
    for (let j = 1; j < segmentLengths.length; j++) {
      if (segmentLengths[j] >= targetDist) {
        segIdx = j - 1;
        break;
      }
      segIdx = j - 1;
    }

    // Interpolate position within segment
    const segStart = segmentLengths[segIdx];
    const segEnd = segmentLengths[segIdx + 1] || segStart;
    const segLength = segEnd - segStart;
    const t = segLength > 0 ? (targetDist - segStart) / segLength : 0;

    const p0 = trailData[segIdx];
    const p1 = trailData[Math.min(segIdx + 1, trailData.length - 1)];

    const rawX = p0.x + (p1.x - p0.x) * t;
    const rawY = p0.y + (p1.y - p0.y) * t;

    // Normalize to canvas
    let x = margin + ((rawX - minX) / rangeX) * usableSize;
    let y = margin + ((rawY - minY) / rangeY) * usableSize;

    // Small random offset for natural look
    x += (random() - 0.5) * baseSize * 0.1;
    y += (random() - 0.5) * baseSize * 0.1;

    // Size variation: more uniform (0.85 to 1.15x) for Murakami look
    const sizeVar = 0.85 + random() * 0.3;
    const maxSize = baseSize * sizeVar;
    const radius = maxSize / 2;

    // Each flower gets a different SVG variant (1-12)
    const svgIndex = Math.floor(random() * DAISY_COUNT);

    // Check collision against OTHER sessions (existingPositions) - stricter
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

    // Check collision within THIS session (localPositions) - more lenient for continuous line
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

    // Add to local positions for subsequent collision checks
    localPositions.push({ x, y, size: maxSize });

    pending.push({
      x,
      y,
      maxSize,
      candyPalette: [sessionColor] as readonly string[], // Single color for session cohesion
      centerColor: sessionCenterColor,
      seed: sessionSeed + i * 123, // Deterministic seed based on session ID
      svgIndex, // Different SVG for each flower
    });
  }

  return pending;
}

/**
 * Create a single trail daisy from pending data
 */
export function createSingleTrailDaisy(pending: PendingDaisy): Daisy {
  return new Daisy(
    pending.x,
    pending.y,
    pending.maxSize,
    pending.candyPalette,
    pending.centerColor,
    pending.seed,
    false,
    0,
    pending.svgIndex
  );
}

/**
 * Initialize images for all daisies
 */
export async function initializeDaisyImages(
  daisies: Daisy[],
  svgs: string[]
): Promise<void> {
  await Promise.all(daisies.map((d) => d.initImage(svgs)));
}
