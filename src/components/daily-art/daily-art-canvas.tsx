'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Play, Pause, Download, RotateCcw, SkipForward } from 'lucide-react';
import { DatePicker } from './date-picker';

import {
  Daisy,
  calculateTrailDaisyPositions,
  createSingleTrailDaisy,
  loadDaisySVGs,
  type PendingDaisy,
} from './form';
import {
  getBackgroundForDate,
  getCandyPaletteForDate,
  getCenterColorsForDate,
  getThemeNameForDate,
  generateBackgroundPositions,
  formatDate,
  getDayOfYear,
} from './utils';
import type { DailyArtSession } from './types';

const CANVAS_SIZE = 2048;
const ANIMATION_DURATION = 60000; // Always 60 seconds for full animation
const FILL_FLOWER_COUNT = 400; // More fill flowers
const POSITION_SPACING = 80; // Closer initial spacing

interface DailyArtCanvasProps {
  initialSessions: DailyArtSession[];
  initialDate: string;
  availableDates: string[];
}

export function DailyArtCanvas({
  initialSessions,
  initialDate,
  availableDates,
}: DailyArtCanvasProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const daisiesRef = useRef<Daisy[]>([]); // All daisies on canvas
  const svgsRef = useRef<string[]>([]);
  const animationRef = useRef<number>(0);
  const animationStartTimeRef = useRef<number>(0);
  const existingPositionsRef = useRef<{ x: number; y: number; size: number }[]>([]);
  const svgsLoadedRef = useRef(false);
  const isPlayingRef = useRef(true);
  const isCompleteRef = useRef(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackSpeedRef = useRef(1);
  const skipToEndRef = useRef(false);

  const [displaySize, setDisplaySize] = useState(600);
  // Use URL date if available, otherwise use initialDate
  const urlDate = searchParams.get('date');
  const [currentDate, setCurrentDate] = useState(
    urlDate && availableDates.includes(urlDate) ? urlDate : initialDate
  );
  const [sessions, setSessions] = useState(initialSessions);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const [totalDaisies, setTotalDaisies] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'sessions' | 'filling' | 'complete'>('loading');

  // Derived values
  const date = useMemo(() => new Date(currentDate + 'T00:00:00Z'), [currentDate]);
  const background = useMemo(() => getBackgroundForDate(date), [date]);
  const candyPalette = useMemo(() => getCandyPaletteForDate(date), [date]);
  const centerColors = useMemo(() => getCenterColorsForDate(date), [date]);
  const themeName = useMemo(() => getThemeNameForDate(date), [date]);
  // Deterministic seed based on full date (year + day of year)
  const daySeed = useMemo(() => {
    const dayOfYear = getDayOfYear(date);
    const year = date.getUTCFullYear();
    return (year * 1000 + dayOfYear) * 12345;
  }, [date]);

  // Sort sessions by createdAt (with stable secondary sort by id)
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      // Secondary sort by id for stability
      return a.id.localeCompare(b.id);
    });
  }, [sessions]);

  // Fetch sessions for a specific date
  const fetchSessions = useCallback(async (dateStr: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/daily-art?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync refs with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isCompleteRef.current = isComplete;
  }, [isComplete]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Clear auto-advance timer
  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setAutoAdvanceCountdown(null);
  }, []);

  // Reset animation state
  const resetAnimation = useCallback(() => {
    clearAutoAdvance();
    daisiesRef.current = [];
    existingPositionsRef.current = [];
    animationStartTimeRef.current = 0;
    isCompleteRef.current = false;
    isPlayingRef.current = true;
    playbackSpeedRef.current = 1;
    skipToEndRef.current = false;
    setIsComplete(false);
    setCurrentProgress(0);
    setRemainingSeconds(60);
    setIsPlaying(true);
    setPlaybackSpeed(1);
    setTotalDaisies(0);
    setPhase('loading');
  }, [clearAutoAdvance]);

  // Update URL with date
  const updateUrlWithDate = useCallback((date: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', date);
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // Set date (updates both state and URL)
  const setDateWithUrl = useCallback((newDate: string) => {
    if (newDate !== currentDate && availableDates.includes(newDate)) {
      clearAutoAdvance();
      setCurrentDate(newDate);
      updateUrlWithDate(newDate);
      resetAnimation();
      fetchSessions(newDate);
    }
  }, [currentDate, availableDates, clearAutoAdvance, updateUrlWithDate, resetAnimation, fetchSessions]);

  // Change date (prev/next)
  const changeDate = useCallback(
    (direction: 'prev' | 'next') => {
      const currentIdx = availableDates.indexOf(currentDate);
      let newIdx: number;

      if (direction === 'prev') {
        newIdx = currentIdx < availableDates.length - 1 ? currentIdx + 1 : currentIdx;
      } else {
        newIdx = currentIdx > 0 ? currentIdx - 1 : currentIdx;
      }

      if (newIdx !== currentIdx) {
        const newDate = availableDates[newIdx];
        setDateWithUrl(newDate);
      }
    },
    [availableDates, currentDate, setDateWithUrl]
  );

  // Auto-advance to next date after completion
  const startAutoAdvance = useCallback(() => {
    const currentIdx = availableDates.indexOf(currentDate);
    const hasNext = currentIdx > 0;

    if (!hasNext) {
      setAutoAdvanceCountdown(null);
      return;
    }

    // Start countdown
    let countdown = 5;
    setAutoAdvanceCountdown(countdown);

    const countdownInterval = setInterval(() => {
      countdown--;
      setAutoAdvanceCountdown(countdown);

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        changeDate('next');
      }
    }, 1000);

    autoAdvanceTimerRef.current = countdownInterval as unknown as NodeJS.Timeout;
  }, [availableDates, currentDate, changeDate]);

  // Skip to end - instantly complete the animation
  const skipToEnd = useCallback(() => {
    skipToEndRef.current = true;
    setIsPlaying(true);
    isPlayingRef.current = true;
  }, []);

  // Cycle playback speed: 1x -> 2x -> 4x -> 1x
  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      const next = prev === 1 ? 2 : prev === 2 ? 4 : 1;
      return next;
    });
  }, []);

  // Download canvas as PNG
  const downloadPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `flower-field-${currentDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [currentDate]);

  // Canvas setup and animation
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      // Calculate available space (subtract padding for controls below)
      const availableWidth = containerRect.width - 32;
      const availableHeight = containerRect.height - 64; // Space for controls
      const maxSize = Math.min(availableWidth, availableHeight);
      const size = Math.max(maxSize, 300);
      setDisplaySize(size);
    };

    resize();
    window.addEventListener('resize', resize);

    let isPlayingLocal = true;
    let initialized = false;
    let lastFlowerSpawnTime = 0;
    let flowerSpawnInterval = 40; // Will be calculated based on queue length

    // Session-based queue: each session's trail flowers in order, with fill flowers between sessions
    type FlowerItem = { type: 'trail'; data: PendingDaisy } | { type: 'fill'; data: { x: number; y: number; size: number } };
    const flowerQueue: FlowerItem[] = [];
    let currentQueueIndex = 0;

    // Load SVGs
    const loadSvgs = async () => {
      if (!svgsLoadedRef.current) {
        svgsRef.current = await loadDaisySVGs();
        svgsLoadedRef.current = true;
      }
    };

    loadSvgs();

    const animate = async (timestamp: number) => {
      isPlayingLocal = isPlayingRef.current;

      // Wait for SVGs to load
      if (!svgsLoadedRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Initialize once - build sequential flower queue
      if (!initialized) {
        initialized = true;
        animationStartTimeRef.current = timestamp;

        // Clear existing state for deterministic results
        daisiesRef.current = [];
        existingPositionsRef.current = [];

        // Pre-generate all fill flower positions
        const allFillPositions = generateBackgroundPositions(
          CANVAS_SIZE,
          FILL_FLOWER_COUNT,
          POSITION_SPACING,
          daySeed + 9999
        );

        // Build queue: for each session, add trail flowers in sequence
        // Sprinkle fill flowers between sessions
        const fillPerSession = Math.floor(allFillPositions.length / (sortedSessions.length + 1));
        let fillIdx = 0;

        // Fill flowers smaller as background layer (trail flowers are larger)
        const fillBaseSize = CANVAS_SIZE * 0.065;

        // Add some initial fill flowers
        for (let i = 0; i < fillPerSession && fillIdx < allFillPositions.length; i++) {
          const pos = allFillPositions[fillIdx];
          // Mixed size layers: 30% tiny, 40% small, 30% medium
          const sizeCategory = (fillIdx * 777) % 100;
          let sizeMult: number;
          if (sizeCategory < 30) {
            sizeMult = 0.4 + ((fillIdx * 123) % 20) / 100; // tiny: 0.4-0.6
          } else if (sizeCategory < 70) {
            sizeMult = 0.7 + ((fillIdx * 456) % 30) / 100; // small: 0.7-1.0
          } else {
            sizeMult = 1.0 + ((fillIdx * 789) % 40) / 100; // medium: 1.0-1.4
          }
          const flowerSize = fillBaseSize * sizeMult;
          const radius = flowerSize / 2;

          let tooClose = false;
          for (const existing of existingPositionsRef.current) {
            const dx = pos.x - existing.x;
            const dy = pos.y - existing.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = radius + existing.size / 2;
            if (dist < minDist * 0.5) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) {
            flowerQueue.push({ type: 'fill', data: { ...pos, size: flowerSize } });
            existingPositionsRef.current.push({ ...pos, size: flowerSize });
          }
          fillIdx++;
        }

        // Process each session - trail flowers appear in sequence along the path
        sortedSessions.forEach((session, idx) => {
          // Calculate trail flowers for this session (they're already in path order)
          const trailFlowers = calculateTrailDaisyPositions(
            session.trailData,
            session.duration,
            candyPalette,
            centerColors,
            CANVAS_SIZE,
            idx,
            existingPositionsRef.current
          );

          // Add all trail flowers for this session in order (this forms the line!)
          for (const flower of trailFlowers) {
            flowerQueue.push({ type: 'trail', data: flower });
          }

          // Add fill flowers between sessions
          for (let i = 0; i < fillPerSession && fillIdx < allFillPositions.length; i++) {
            const pos = allFillPositions[fillIdx];
            // Mixed size layers
            const sizeCategory = (fillIdx * 777) % 100;
            let sizeMult: number;
            if (sizeCategory < 30) {
              sizeMult = 0.4 + ((fillIdx * 123) % 20) / 100;
            } else if (sizeCategory < 70) {
              sizeMult = 0.7 + ((fillIdx * 456) % 30) / 100;
            } else {
              sizeMult = 1.0 + ((fillIdx * 789) % 40) / 100;
            }
            const flowerSize = fillBaseSize * sizeMult;
            const radius = flowerSize / 2;

            let tooClose = false;
            for (const existing of existingPositionsRef.current) {
              const dx = pos.x - existing.x;
              const dy = pos.y - existing.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const minDist = radius + existing.size / 2;
              if (dist < minDist * 0.5) {
                tooClose = true;
                break;
              }
            }
            if (!tooClose) {
              flowerQueue.push({ type: 'fill', data: { ...pos, size: flowerSize } });
              existingPositionsRef.current.push({ ...pos, size: flowerSize });
            }
            fillIdx++;
          }
        });

        // Add remaining fill flowers
        while (fillIdx < allFillPositions.length) {
          const pos = allFillPositions[fillIdx];
          // Mixed size layers
          const sizeCategory = (fillIdx * 777) % 100;
          let sizeMult: number;
          if (sizeCategory < 30) {
            sizeMult = 0.4 + ((fillIdx * 123) % 20) / 100;
          } else if (sizeCategory < 70) {
            sizeMult = 0.7 + ((fillIdx * 456) % 30) / 100;
          } else {
            sizeMult = 1.0 + ((fillIdx * 789) % 40) / 100;
          }
          const flowerSize = fillBaseSize * sizeMult;
          const radius = flowerSize / 2;

          let tooClose = false;
          for (const existing of existingPositionsRef.current) {
            const dx = pos.x - existing.x;
            const dy = pos.y - existing.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = radius + existing.size / 2;
            if (dist < minDist * 0.5) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) {
            flowerQueue.push({ type: 'fill', data: { ...pos, size: flowerSize } });
            existingPositionsRef.current.push({ ...pos, size: flowerSize });
          }
          fillIdx++;
        }

        // Calculate spawn interval to make animation always 60 seconds
        // Minimum interval of 20ms to prevent too fast spawning
        flowerSpawnInterval = Math.max(20, Math.floor(ANIMATION_DURATION / Math.max(1, flowerQueue.length)));

        setPhase('sessions');
      }

      // Calculate progress
      const queueProgress = flowerQueue.length > 0 ? currentQueueIndex / flowerQueue.length : 0;

      // Update progress
      if (isPlayingLocal) {
        setCurrentProgress(queueProgress);

        // Update countdown timer (60 seconds total)
        const elapsed = Math.floor(queueProgress * 60);
        setRemainingSeconds(Math.max(0, 60 - elapsed));
      }

      // Spawn flowers from queue - supports speed multiplier and skip to end
      // Uses calculated interval to ensure 60-second total animation at 1x speed
      if (isPlayingLocal && currentQueueIndex < flowerQueue.length && !isCompleteRef.current) {
        const shouldSkip = skipToEndRef.current;
        const speed = playbackSpeedRef.current;
        const adjustedInterval = flowerSpawnInterval / speed;

        // Determine how many flowers to spawn this frame
        let flowersToSpawn = 0;
        if (shouldSkip) {
          // Skip to end - spawn all remaining flowers
          flowersToSpawn = flowerQueue.length - currentQueueIndex;
        } else if (timestamp - lastFlowerSpawnTime > adjustedInterval) {
          // Normal playback - spawn based on speed
          flowersToSpawn = speed; // 1x = 1, 2x = 2, 4x = 4 flowers per interval
        }

        for (let i = 0; i < flowersToSpawn && currentQueueIndex < flowerQueue.length; i++) {
          const item = flowerQueue[currentQueueIndex];

          if (item.type === 'trail') {
            const pending = item.data;
            const newDaisy = createSingleTrailDaisy(pending);
            await newDaisy.initImage(svgsRef.current);
            daisiesRef.current.push(newDaisy);
          } else {
            // Fill flower - use pre-calculated size from queue data
            const pos = item.data;
            const seedVal = daySeed + currentQueueIndex * 777;
            const random = () => {
              let state = seedVal;
              state = (state + 0x6d2b79f5) | 0;
              let t = Math.imul(state ^ (state >>> 15), 1 | state);
              t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
              return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };

            const centerColor = centerColors[Math.floor(random() * centerColors.length)];
            const svgIndex = Math.floor(random() * 12);

            const daisy = new Daisy(
              pos.x,
              pos.y,
              pos.size, // Use pre-calculated size
              candyPalette,
              centerColor,
              seedVal,
              true, // isBackground - instant bloom
              0,
              svgIndex
            );
            await daisy.initImage(svgsRef.current);
            daisiesRef.current.push(daisy);
          }

          currentQueueIndex++;
        }

        if (flowersToSpawn > 0) {
          lastFlowerSpawnTime = timestamp;
          setTotalDaisies(daisiesRef.current.length);
        }

        // Reset skip flag after processing
        if (shouldSkip) {
          skipToEndRef.current = false;
        }
      }

      // Check completion - only if we actually have flowers to show
      if (flowerQueue.length > 0 && currentQueueIndex >= flowerQueue.length && !isCompleteRef.current) {
        const allDone = daisiesRef.current.every((d) => d.isDone());
        if (allDone) {
          isCompleteRef.current = true;
          isPlayingRef.current = false;
          setIsComplete(true);
          setIsPlaying(false);
          setPhase('complete');
          // Start auto-advance countdown
          startAutoAdvance();
        }
      }

      // Clear and redraw
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw and animate all daisies
      for (const daisy of daisiesRef.current) {
        daisy.run(ctx);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    sortedSessions,
    candyPalette,
    centerColors,
    background,
    daySeed,
    date,
    startAutoAdvance,
  ]);

  // Cleanup auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const currentDateIdx = availableDates.indexOf(currentDate);
  const hasPrev = currentDateIdx < availableDates.length - 1;
  const hasNext = currentDateIdx > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center"
    >
      {/* Canvas */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: displaySize,
          height: displaySize,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: displaySize,
            height: displaySize,
            display: 'block',
          }}
        />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-zinc-400 text-sm">Loading...</div>
          </div>
        )}

        {!isLoading && sortedSessions.length === 0 && phase !== 'filling' && phase !== 'complete' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-zinc-500 text-sm text-center">
              <div>No proofs on this day</div>
              <div className="text-xs mt-1 opacity-60">Try another date</div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-3xl px-4 pt-4 pb-2">
        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-100"
              style={{ width: `${currentProgress * 100}%` }}
            />
          </div>
        </div>

        {/* Date navigation and controls */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => changeDate('prev')}
            disabled={!hasPrev || isLoading}
            className="p-2 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Date display with calendar picker */}
          <DatePicker
            selectedDate={currentDate}
            availableDates={availableDates}
            onDateSelect={setDateWithUrl}
          >
            <div className="text-center min-w-[160px] cursor-pointer hover:opacity-80 transition-opacity">
              <div className="text-white text-sm font-light tracking-wide">
                {formatDate(date)}
              </div>
              <div className="text-zinc-400 text-[10px] font-medium">
                {themeName}
              </div>
              <div className="text-zinc-500 text-[10px] font-mono">
                {sortedSessions.length} sessions / {totalDaisies} flowers
              </div>
            </div>
          </DatePicker>

          <button
            onClick={() => changeDate('next')}
            disabled={!hasNext || isLoading}
            className="p-2 text-zinc-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-zinc-700 mx-2" />

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={isComplete || sortedSessions.length === 0}
            className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={cycleSpeed}
            disabled={isComplete || sortedSessions.length === 0}
            className="px-2 py-1 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors text-xs font-mono min-w-[32px]"
            title="Change playback speed"
          >
            {playbackSpeed}x
          </button>

          <button
            onClick={skipToEnd}
            disabled={isComplete || sortedSessions.length === 0}
            className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Skip to end"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={resetAnimation}
            disabled={phase === 'loading'}
            className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {!isComplete && (
            <div className="text-zinc-500 text-[10px] font-mono min-w-[50px] text-center">
              {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
            </div>
          )}

          {/* Auto-advance countdown */}
          {autoAdvanceCountdown !== null && hasNext && (
            <button
              onClick={clearAutoAdvance}
              className="text-purple-400 text-[10px] font-mono min-w-[60px] text-center hover:text-purple-300 transition-colors"
              title="Click to cancel auto-advance"
            >
              Next in {autoAdvanceCountdown}s
            </button>
          )}

          <button
            onClick={downloadPoster}
            disabled={!isComplete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 bg-white/5 rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      </div>
  );
}
