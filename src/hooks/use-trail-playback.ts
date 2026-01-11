'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { TrailPoint } from '@/types/session';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number; // Current playback time in ms
  duration: number; // Total duration in ms
  speed: number; // Playback speed multiplier (0.5, 1, 2, 4)
}

export interface UseTrailPlaybackReturn extends PlaybackState {
  visiblePoints: TrailPoint[];
  cometPosition: [number, number, number] | null;
  progress: number; // 0-1 progress value
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (timeMs: number) => void;
  seekProgress: (progress: number) => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
  updateTime: (deltaMs: number) => void;
}

/**
 * Get visible points based on current playback time
 * Points are visible if their timestamp <= currentTime
 * Stroke boundaries (t=-1) are included if the next stroke has started
 */
function getVisiblePoints(
  allPoints: TrailPoint[],
  currentTimeMs: number
): TrailPoint[] {
  if (allPoints.length === 0) return [];

  const visible: TrailPoint[] = [];

  for (let i = 0; i < allPoints.length; i++) {
    const point = allPoints[i];

    if (point.t === -1) {
      // Stroke boundary marker
      // Include it if the next real point is visible
      const nextRealPoint = allPoints.slice(i + 1).find((p) => p.t !== -1);
      if (nextRealPoint && currentTimeMs >= nextRealPoint.t) {
        visible.push(point);
      }
    } else if (point.t <= currentTimeMs) {
      visible.push(point);
    }
  }

  return visible;
}

/**
 * Get the position for the CometHead (drawing cursor)
 * Returns the last visible non-boundary point, or interpolates for smoother animation
 */
function getCometPosition(
  allPoints: TrailPoint[],
  visiblePoints: TrailPoint[],
  currentTimeMs: number
): [number, number, number] | null {
  if (visiblePoints.length === 0) return null;

  // Find the last non-boundary point
  const lastVisible = [...visiblePoints].reverse().find((p) => p.t !== -1);
  if (!lastVisible) return null;

  // Find the next point for interpolation
  const lastVisibleIndex = allPoints.indexOf(lastVisible);
  const nextPoint = allPoints
    .slice(lastVisibleIndex + 1)
    .find((p) => p.t !== -1);

  if (nextPoint && currentTimeMs > lastVisible.t) {
    // Interpolate between last visible and next point
    const timeDiff = nextPoint.t - lastVisible.t;
    const elapsed = currentTimeMs - lastVisible.t;
    const t = Math.min(1, elapsed / timeDiff);

    return [
      lastVisible.x + (nextPoint.x - lastVisible.x) * t,
      lastVisible.y + (nextPoint.y - lastVisible.y) * t,
      lastVisible.z + (nextPoint.z - lastVisible.z) * t,
    ];
  }

  return [lastVisible.x, lastVisible.y, lastVisible.z];
}

/**
 * Calculate total duration from trail points
 */
function calculateDuration(points: TrailPoint[]): number {
  if (points.length === 0) return 0;

  let maxTime = 0;
  for (const point of points) {
    if (point.t !== -1 && point.t > maxTime) {
      maxTime = point.t;
    }
  }
  return maxTime;
}

export function useTrailPlayback(
  trailData: TrailPoint[]
): UseTrailPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeedState] = useState(1);

  // Calculate duration once
  const duration = useMemo(() => calculateDuration(trailData), [trailData]);

  // Calculate visible points based on current time
  const visiblePoints = useMemo(
    () => getVisiblePoints(trailData, currentTime),
    [trailData, currentTime]
  );

  // Calculate comet position
  const cometPosition = useMemo(
    () => getCometPosition(trailData, visiblePoints, currentTime),
    [trailData, visiblePoints, currentTime]
  );

  // Progress as 0-1 value
  const progress = duration > 0 ? currentTime / duration : 0;

  // Ref to track if we've completed playback
  const hasCompletedRef = useRef(false);

  // Control methods
  const play = useCallback(() => {
    // If at the end, restart from beginning
    if (currentTime >= duration) {
      setCurrentTime(0);
    }
    hasCompletedRef.current = false;
    setIsPlaying(true);
  }, [currentTime, duration]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (timeMs: number) => {
      const clampedTime = Math.max(0, Math.min(timeMs, duration));
      setCurrentTime(clampedTime);
      hasCompletedRef.current = false;
    },
    [duration]
  );

  const seekProgress = useCallback(
    (prog: number) => {
      const clampedProgress = Math.max(0, Math.min(1, prog));
      seek(clampedProgress * duration);
    },
    [duration, seek]
  );

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setSpeedState(1);
    hasCompletedRef.current = false;
  }, []);

  // Update time - called from useFrame in the canvas
  const updateTime = useCallback(
    (deltaMs: number) => {
      if (!isPlaying) return;

      setCurrentTime((prev) => {
        const next = prev + deltaMs * speed;
        if (next >= duration) {
          // Stop at the end
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            setIsPlaying(false);
          }
          return duration;
        }
        return next;
      });
    },
    [isPlaying, speed, duration]
  );

  return {
    isPlaying,
    currentTime,
    duration,
    speed,
    visiblePoints,
    cometPosition,
    progress,
    play,
    pause,
    toggle,
    seek,
    seekProgress,
    setSpeed,
    reset,
    updateTime,
  };
}
