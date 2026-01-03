'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

// 8 colors: Okazz original 4 + 4 complementary colors
const PALETTE = [
  '#1160c6', // Okazz blue
  '#fdd900', // Okazz yellow
  '#e6302b', // Okazz red
  '#ffffff', // Okazz white
  '#00c9a7', // Teal (complement to red)
  '#ff6b35', // Orange (between red & yellow)
  '#845ec2', // Purple (complement to yellow)
  '#c4fcef', // Light cyan (complement to blue)
];

interface TrailData {
  x: number;
  y: number;
  z?: number;
  t?: number;
}

interface Trail {
  id: string;
  trailData: TrailData[];
  color: string;
  duration: number;
  userName?: string;
  title?: string;
  createdAt: Date | string;
}

interface TrailWalkersProps {
  trails: Trail[];
}

interface WalkerMeta {
  id: string;
  userName?: string;
  title?: string;
  duration: number;
  createdAt: Date | string;
}

// Walker class - each represents a soul's journey
class Walker {
  x: number;
  y: number;
  d: number;
  color: string;
  footprints: { x: number; y: number }[];
  segLength: number;
  spd: number;
  vx: number;
  vy: number;
  orbs: Orb[];
  trailPath: { x: number; y: number }[];
  pathIndex: number;
  followPath: boolean;
  pathCompleted: boolean; // Has the walker completed its path?
  meta: WalkerMeta | null;
  opacity: number;
  targetOpacity: number;
  isEntering: boolean;
  isExiting: boolean;
  lifespan: number; // How long this walker lives (based on trail duration)
  age: number; // Current age in frames
  trailLength: number;

  constructor(
    x: number,
    y: number,
    d: number,
    color: string,
    size: number,
    trailPath?: { x: number; y: number }[],
    meta?: WalkerMeta,
    lifespan?: number
  ) {
    this.x = x;
    this.y = y;
    this.d = d;
    this.color = color;
    this.footprints = [];
    this.trailPath = trailPath || [];
    this.pathIndex = 0;
    this.followPath = Boolean(trailPath && trailPath.length > 0);
    this.pathCompleted = false;
    this.meta = meta || null;
    this.opacity = 0;
    this.targetOpacity = 1;
    this.isEntering = true;
    this.isExiting = false;
    this.lifespan = lifespan || 18000; // Default ~5 minutes at 60fps
    this.age = 0;

    // Trail length: random 50-80 like original Okazz
    this.trailLength = Math.floor(50 + Math.random() * 30);

    for (let i = 0; i < this.trailLength; i++) {
      this.footprints.push({ x: this.x, y: this.y });
    }

    // Much slower movement so walker takes time to complete path
    this.segLength = size / 700;
    this.spd = size / 2000;
    this.vx =
      (Math.random() < 0.5 ? -1 : 1) * this.spd * (Math.random() * 0.5 + 0.2);
    this.vy =
      (Math.random() < 0.5 ? -1 : 1) * this.spd * (Math.random() * 0.5 + 0.2);
    this.orbs = [];
  }

  show(ctx: CanvasRenderingContext2D) {
    // Smooth fade in/out
    if (this.isEntering && this.opacity < this.targetOpacity) {
      this.opacity = Math.min(this.opacity + 0.02, this.targetOpacity);
      if (this.opacity >= this.targetOpacity) this.isEntering = false;
    }
    if (this.isExiting) {
      this.opacity = Math.max(this.opacity - 0.015, 0);
    }

    ctx.globalAlpha = this.opacity;

    // Draw orbs with glow
    for (const orb of this.orbs) {
      orb.show(ctx, this.opacity);
    }

    // Draw trail - solid color, tapered from head to tail (like original Okazz)
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    ctx.globalAlpha = this.opacity;

    this.dragSegment(0, this.x, this.y);
    for (let i = 0; i < this.footprints.length - 1; i++) {
      const f = this.footprints[i];
      const progress = i / this.footprints.length;
      // Taper from d at head to 0 at tail
      const sw = progress * this.d;
      ctx.lineWidth = Math.max(1, this.d - sw);

      this.dragSegment(i + 1, f.x, f.y);
      this.segment(ctx, f.x, f.y, Math.atan2(f.y - this.y, f.x - this.x));
    }

    ctx.globalAlpha = 1;
  }

  update(size: number, allWalkers: Walker[], speedMultiplier: number) {
    this.age++;

    // Session walkers exit after completing path (with minimum time on screen)
    // Filler walkers exit based on lifespan
    const MIN_SESSION_AGE = 3600; // ~1 minute minimum on screen
    if (!this.isExiting) {
      if (this.meta && this.pathCompleted && this.age > MIN_SESSION_AGE) {
        this.startExit();
      } else if (!this.meta && this.age > this.lifespan * 0.8) {
        this.startExit();
      }
    }

    // Apply repulsion forces (gentler to allow path following)
    for (const other of allWalkers) {
      if (other === this) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDist = (this.d + other.d) * 2;

      if (distance < minDist && distance > 0) {
        const force = (minDist - distance) * 0.001;
        const nx = dx / distance;
        const ny = dy / distance;
        this.vx -= force * nx;
        this.vy -= force * ny;
      }
    }

    // Follow trail path until complete - slow and steady
    if (this.followPath && this.trailPath.length > 0 && !this.pathCompleted) {
      const target = this.trailPath[this.pathIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 3) {
        // Move to next point
        this.pathIndex++;
        if (this.pathIndex >= this.trailPath.length) {
          this.pathCompleted = true;
        }
      } else {
        // Move toward target point - very gentle pull
        const followStrength = 0.015;
        this.vx += (dx / dist) * followStrength;
        this.vy += (dy / dist) * followStrength;
      }
    }

    // Slower velocity damping for smoother, slower movement
    this.vx *= 0.995;
    this.vy *= 0.995;

    this.x += this.vx * speedMultiplier;
    this.y += this.vy * speedMultiplier;

    // Bounce off walls
    const r = this.d / 2;
    if (this.x <= r || size - r <= this.x) {
      this.vx *= -1;
      this.vx =
        (Math.random() < 0.5 ? -1 : 1) * this.spd * (Math.random() * 0.9 + 0.1);
    }
    if (this.y <= r || size - r <= this.y) {
      this.vy *= -1;
      this.vy =
        (Math.random() < 0.5 ? -1 : 1) * this.spd * (Math.random() * 0.9 + 0.1);
    }

    this.x = Math.max(r, Math.min(size - r, this.x));
    this.y = Math.max(r, Math.min(size - r, this.y));

    // Spawn orbs more frequently
    if (Math.random() < 0.2 * speedMultiplier && this.opacity > 0.5) {
      this.orbs.push(new Orb(this.x, this.y, this.d * 0.3, this.color, size));
    }

    for (const orb of this.orbs) {
      orb.update();
    }
    this.orbs = this.orbs.filter((o) => !o.isDead);
  }

  run(
    ctx: CanvasRenderingContext2D,
    size: number,
    allWalkers: Walker[],
    speedMultiplier: number
  ) {
    this.show(ctx);
    this.update(size, allWalkers, speedMultiplier);
  }

  dragSegment(i: number, xin: number, yin: number) {
    const f = this.footprints[i];
    const dx = xin - f.x;
    const dy = yin - f.y;
    const angle = Math.atan2(dy, dx);
    f.x = xin - Math.cos(angle) * this.segLength;
    f.y = yin - Math.sin(angle) * this.segLength;
  }

  segment(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.segLength, 0);
    ctx.stroke();
    ctx.restore();
  }

  startExit() {
    this.isExiting = true;
    this.targetOpacity = 0;
  }

  isDead(): boolean {
    return this.isExiting && this.opacity <= 0;
  }
}

// Orb class - glowing particles
class Orb {
  x: number;
  y: number;
  d: number;
  color: string;
  span: number;
  life: number;
  tgtX: number;
  tgtY: number;
  curX: number;
  curY: number;
  curD: number;
  isDead: boolean;

  constructor(x: number, y: number, d: number, color: string, size: number) {
    this.x = x;
    this.y = y;
    this.d = d;
    this.color = color;
    this.span = 60 + Math.random() * 40;
    this.life = this.span;

    const a = Math.random() * Math.PI * 2;
    const r = (size / 30) * Math.random();
    this.tgtX = this.x + r * Math.cos(a);
    this.tgtY = this.y + r * Math.sin(a);
    this.curX = x;
    this.curY = y;
    this.curD = d;
    this.isDead = false;
  }

  show(ctx: CanvasRenderingContext2D, parentOpacity: number) {
    const alpha = (this.life / this.span) * parentOpacity;

    // Simple small dot - no glow
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.curX, this.curY, this.curD * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  update() {
    this.life--;
    if (this.life <= 0) this.isDead = true;

    const n = 1 - this.life / this.span;
    this.curX = this.x + (this.tgtX - this.x) * n;
    this.curY = this.y + (this.tgtY - this.y) * n;
    this.curD = this.d * (1 - n * 0.3);
  }
}

// Convert trail data to screen coordinates - sample to ~100 points max
function trailToScreenPath(
  trailData: TrailData[],
  size: number
): { x: number; y: number }[] {
  if (!trailData || trailData.length === 0) return [];

  // Sample points to avoid too many (target ~100 points)
  const maxPoints = 100;
  const step = Math.max(1, Math.floor(trailData.length / maxPoints));
  const sampledData: TrailData[] = [];
  for (let i = 0; i < trailData.length; i += step) {
    sampledData.push(trailData[i]);
  }
  // Always include last point
  if (sampledData[sampledData.length - 1] !== trailData[trailData.length - 1]) {
    sampledData.push(trailData[trailData.length - 1]);
  }

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const p of sampledData) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const margin = size * 0.1;

  return sampledData.map((p) => ({
    x: margin + ((p.x - minX) / rangeX) * (size - margin * 2),
    y: margin + ((p.y - minY) / rangeY) * (size - margin * 2),
  }));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function TrailWalkers({ trails }: TrailWalkersProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const walkersRef = useRef<Walker[]>([]);
  const animationRef = useRef<number>(0);
  const currentTrailIndexRef = useRef(0);
  const lastAddTimeRef = useRef(0);

  const [canvasSize, setCanvasSize] = useState(600);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [walkerCount, setWalkerCount] = useState(0);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const speedRef = useRef(speed);
  const isPlayingRef = useRef(isPlaying);
  const currentDayIndexRef = useRef(currentDayIndex);
  const sizeRef = useRef(600); // Track actual size for animation loop

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(() => {
    currentDayIndexRef.current = currentDayIndex;
  }, [currentDayIndex]);

  // Sort trails by createdAt and group by day
  const { sortedTrails, dayGroups } = useMemo(() => {
    const sorted = [...trails].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Group by day
    const groups: Map<
      string,
      { date: Date; startIndex: number; count: number }
    > = new Map();

    sorted.forEach((trail, index) => {
      const date = new Date(trail.createdAt);
      const dateStr = date.toISOString().split('T')[0];

      if (!groups.has(dateStr)) {
        groups.set(dateStr, {
          date: new Date(dateStr),
          startIndex: index,
          count: 0,
        });
      }
      groups.get(dateStr)!.count++;
    });

    const dayList = Array.from(groups.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return { sortedTrails: sorted, dayGroups: dayList };
  }, [trails]);

  // Create walker from trail - walks the full path before exiting
  const createWalker = useCallback(
    (trail: Trail | null, size: number, index: number): Walker => {
      const screenPath = trail ? trailToScreenPath(trail.trailData, size) : [];

      // Start position: at trail start if available, otherwise random
      const x = screenPath.length > 0 ? screenPath[0].x : Math.random() * size;
      const y = screenPath.length > 0 ? screenPath[0].y : Math.random() * size;

      // Size: thicker like original Okazz (width / random(40, 60))
      const d = size / (40 + Math.random() * 20);

      // Use palette color based on index
      const color = PALETTE[index % PALETTE.length];

      const meta: WalkerMeta | undefined = trail
        ? {
            id: trail.id,
            userName: trail.userName,
            title: trail.title,
            duration: trail.duration,
            createdAt: trail.createdAt,
          }
        : undefined;

      // Lifespan: 3-10 minutes (year-long visualization)
      const lifespan = trail
        ? Math.min(Math.max(trail.duration * 10, 10800), 36000) // 3-10 min based on duration
        : 18000 + Math.random() * 18000; // 5-10 minutes default

      return new Walker(x, y, d, color, size, screenPath, meta, lifespan);
    },
    []
  );

  // Jump to day - clear walkers and restart (manual jump)
  const jumpToDay = useCallback(
    (dayIndex: number, manual: boolean = false) => {
      if (dayGroups.length === 0) return;

      const day = dayGroups[dayIndex];
      if (!day) return;

      currentTrailIndexRef.current = day.startIndex;

      // Manual jump: clear all walkers and restart fresh
      if (manual) {
        walkersRef.current.forEach((w) => w.startExit());
      }
    },
    [dayGroups]
  );

  // Don't auto-jump on day change - only manual jumps should clear
  // useEffect removed - jumpToDay is only called manually now

  // Canvas setup and animation
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const MIN_WALKERS = 20;
    const MAX_WALKERS = 50;
    const BASE_ADD_INTERVAL = 2000; // Slower adding, let walkers complete paths

    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      const maxSize = Math.min(
        containerRect.width - 40,
        containerRect.height - 120
      );
      const size = Math.max(Math.min(maxSize, 900), 200); // Minimum 200px
      sizeRef.current = size; // Update ref immediately
      setCanvasSize(size);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.scale(dpr, dpr);
      // Don't clear walkers on resize - sessions should stay permanently
    };

    resize();
    window.addEventListener('resize', resize);

    let frameCount = 0;

    const animate = (timestamp: number) => {
      const size = sizeRef.current;

      // Clear with slight fade for motion trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(0, 0, size, size);

      // Update and draw walkers (speed=1, don't affect movement)
      for (const walker of walkersRef.current) {
        walker.run(ctx, size, walkersRef.current, 1);
      }

      // Remove dead walkers
      walkersRef.current = walkersRef.current.filter((w) => !w.isDead());

      const activeWalkers = walkersRef.current.filter((w) => !w.isExiting);

      // Auto-play: fade out oldest when exceeding MAX
      if (activeWalkers.length > MAX_WALKERS) {
        // Find oldest active walker and start its exit
        const oldest = activeWalkers.reduce((a, b) => (a.age > b.age ? a : b));
        oldest.startExit();
      }

      // Add new walkers naturally (speed affects time progression only)
      if (isPlayingRef.current) {
        const timeSinceLastAdd = timestamp - lastAddTimeRef.current;
        const adjustedInterval = BASE_ADD_INTERVAL / speedRef.current;

        // Add when below minimum or interval passed
        const shouldAdd =
          activeWalkers.length < MIN_WALKERS ||
          (timeSinceLastAdd > adjustedInterval &&
            activeWalkers.length <= MAX_WALKERS);

        if (shouldAdd) {
          // Get next trail if available (no looping - each session shown once)
          let trail: Trail | null = null;
          if (sortedTrails.length > 0 && currentTrailIndexRef.current < sortedTrails.length) {
            trail = sortedTrails[currentTrailIndexRef.current];
            currentTrailIndexRef.current++;

            // Update day index
            if (trail) {
              const trailDate = new Date(trail.createdAt)
                .toISOString()
                .split('T')[0];
              const dayIdx = dayGroups.findIndex(
                (d) => d.date.toISOString().split('T')[0] === trailDate
              );
              if (dayIdx >= 0 && dayIdx !== currentDayIndexRef.current) {
                setCurrentDayIndex(dayIdx);
              }
              setCurrentTime(new Date(trail.createdAt));
            }
          }

          // Only create walker if we have a real trail (no fillers)
          if (trail) {
            const walkerIndex = walkersRef.current.length;
            walkersRef.current.push(createWalker(trail, size, walkerIndex));
            lastAddTimeRef.current = timestamp;
          }
        }
      }

      // Update display
      frameCount++;
      if (frameCount % 20 === 0) {
        setWalkerCount(activeWalkers.length);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize with actual sessions only (no fillers, no repeats)
    if (walkersRef.current.length === 0 && sortedTrails.length > 0) {
      const size = sizeRef.current;
      const initialCount = Math.min(MIN_WALKERS, sortedTrails.length);
      for (let i = 0; i < initialCount; i++) {
        const trail = sortedTrails[i];
        const walker = createWalker(trail, size, i);
        // Stagger initial opacity
        walker.opacity = 0.3 + Math.random() * 0.7;
        walkersRef.current.push(walker);
      }
      currentTrailIndexRef.current = initialCount;
      setCurrentTime(new Date(sortedTrails[0].createdAt));
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [canvasSize, sortedTrails, dayGroups, createWalker]);

  const currentGroup = dayGroups[currentDayIndex];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center"
    >
      {/* Centered Square Canvas */}
      <div
        className="relative bg-black"
        style={{ width: canvasSize, height: canvasSize }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>

      {/* Timeline at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-8 py-4">
        <div className="max-w-2xl mx-auto">
          <input
            type="range"
            min={0}
            max={Math.max(0, dayGroups.length - 1)}
            value={currentDayIndex}
            onChange={(e) => {
              const newIndex = parseInt(e.target.value);
              setCurrentDayIndex(newIndex);
              jumpToDay(newIndex, true); // Manual jump - clear walkers
            }}
            className="w-full h-0.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>

        <div className="flex items-center justify-center gap-6 mt-3">
          <button
            onClick={() => {
              const newIndex = Math.max(0, currentDayIndex - 1);
              setCurrentDayIndex(newIndex);
              jumpToDay(newIndex, true); // Manual jump - clear walkers
            }}
            className="text-white/30 hover:text-white/60 text-xs font-mono"
          >
            ←
          </button>

          <div className="text-center min-w-[140px]">
            <div className="text-white/80 text-sm font-light">
              {currentGroup ? formatDate(currentGroup.date) : '--'}
              {currentTime && (
                <span className="text-white/40 ml-2 text-xs">
                  {formatTime(currentTime)}
                </span>
              )}
            </div>
            <div className="text-white/30 text-[10px] font-mono">
              {currentGroup ? `${currentGroup.count} proofs` : ''}
            </div>
          </div>

          <button
            onClick={() => {
              const newIndex = Math.min(dayGroups.length - 1, currentDayIndex + 1);
              setCurrentDayIndex(newIndex);
              jumpToDay(newIndex, true); // Manual jump - clear walkers
            }}
            className="text-white/30 hover:text-white/60 text-xs font-mono"
          >
            →
          </button>

          <div className="w-px h-4 bg-white/10" />

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-white/40 hover:text-white/70 text-xs font-mono"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={() => setSpeed((s) => (s >= 3 ? 0.5 : s + 0.5))}
            className="text-white/40 hover:text-white/70 text-xs font-mono min-w-[24px]"
          >
            {speed}x
          </button>
        </div>
      </div>

      {/* Corner info */}
      <div className="absolute top-4 left-4 text-white/20 text-[10px] font-mono">
        {walkerCount} souls
      </div>

      <div className="absolute top-4 right-4 text-white/20 text-[10px] font-mono text-right">
        <div>
          {dayGroups.length > 0
            ? `Day ${currentDayIndex + 1} / ${dayGroups.length}`
            : ''}
        </div>
        {dayGroups.length > 0 && (
          <div className="text-white/10">
            {dayGroups[0]?.date.getFullYear()} - {dayGroups[dayGroups.length - 1]?.date.getFullYear()}
          </div>
        )}
      </div>
    </div>
  );
}
