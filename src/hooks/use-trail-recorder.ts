'use client';

import { useRef, useCallback } from 'react';
import {
  TrailPoint,
  SessionState,
  DrawingState,
  MIN_SESSION_DURATION,
  CHUNK_SIZE,
} from '@/types/session';

const INITIAL_STATE: SessionState = {
  isRecording: false,
  startTime: null,
  duration: 0,
  points: [],
  frozenChunks: [],
  sectorId: 1,
  // Multi-stroke support
  drawingState: 'idle',
  strokeStartTime: null,
  cumulativeDrawingMs: 0,
};

export function useTrailRecorder() {
  const stateRef = useRef<SessionState>({ ...INITIAL_STATE });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start or stop the duration update interval
  const startTimerInterval = useCallback(() => {
    if (intervalRef.current) return; // Already running

    intervalRef.current = setInterval(() => {
      if (
        stateRef.current.drawingState === 'drawing' &&
        stateRef.current.strokeStartTime
      ) {
        const strokeElapsed = Date.now() - stateRef.current.strokeStartTime;
        stateRef.current.duration =
          (stateRef.current.cumulativeDrawingMs + strokeElapsed) / 1000;
      }
    }, 100);
  }, []);

  const stopTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start a new stroke (or start first stroke of session)
  const startStroke = useCallback(() => {
    const now = Date.now();
    const currentState = stateRef.current.drawingState;

    if (currentState === 'idle') {
      // First stroke - initialize new session
      stateRef.current = {
        ...INITIAL_STATE,
        isRecording: true,
        startTime: now,
        strokeStartTime: now,
        drawingState: 'drawing',
        points: [],
        frozenChunks: [],
        sectorId: stateRef.current.sectorId, // Preserve sectorId
      };
    } else if (currentState === 'paused') {
      // Resuming from pause - add stroke boundary marker
      stateRef.current.points.push({ x: 0, y: 0, z: 0, t: -1 });
      stateRef.current.strokeStartTime = now;
      stateRef.current.drawingState = 'drawing';
      stateRef.current.isRecording = true;
    }
    // If already 'drawing' or 'done', do nothing

    startTimerInterval();
    return stateRef.current;
  }, [startTimerInterval]);

  // End current stroke (pause)
  const endStroke = useCallback(() => {
    if (stateRef.current.drawingState !== 'drawing') {
      return stateRef.current;
    }

    const now = Date.now();
    const strokeDuration = stateRef.current.strokeStartTime
      ? now - stateRef.current.strokeStartTime
      : 0;

    // Accumulate drawing time
    stateRef.current.cumulativeDrawingMs += strokeDuration;
    stateRef.current.duration = stateRef.current.cumulativeDrawingMs / 1000;
    stateRef.current.drawingState = 'paused';
    stateRef.current.strokeStartTime = null;
    stateRef.current.isRecording = false;

    stopTimerInterval();
    return { ...stateRef.current };
  }, [stopTimerInterval]);

  // Finish session completely (called when user clicks "Done")
  const finishSession = useCallback(() => {
    // If currently drawing, end the stroke first
    if (stateRef.current.drawingState === 'drawing') {
      endStroke();
    }

    stateRef.current.drawingState = 'done';
    stateRef.current.isRecording = false;

    const finalState = { ...stateRef.current };
    return finalState;
  }, [endStroke]);

  // Reset to initial state (for clearing)
  const resetSession = useCallback(() => {
    stopTimerInterval();
    stateRef.current = {
      ...INITIAL_STATE,
      sectorId: stateRef.current.sectorId,
    };
    return stateRef.current;
  }, [stopTimerInterval]);

  // Record a new trail point (called on mouse/touch move)
  const recordPoint = useCallback((x: number, y: number, z: number = 0) => {
    if (
      stateRef.current.drawingState !== 'drawing' ||
      !stateRef.current.strokeStartTime
    ) {
      return;
    }

    // Calculate time: cumulative + current stroke elapsed
    const strokeElapsed = Date.now() - stateRef.current.strokeStartTime;
    const totalElapsed = stateRef.current.cumulativeDrawingMs + strokeElapsed;

    const point: TrailPoint = {
      x,
      y,
      z,
      t: totalElapsed,
    };

    stateRef.current.points.push(point);

    // Freeze chunk when it reaches CHUNK_SIZE (keep some overlap for smooth transitions)
    if (stateRef.current.points.length >= CHUNK_SIZE) {
      // Keep last few points for continuity with next chunk
      const overlapPoints = 5;
      const chunkToFreeze = stateRef.current.points.slice(0, -overlapPoints);
      stateRef.current.frozenChunks.push(chunkToFreeze);
      // Start new active chunk with overlap points
      stateRef.current.points = stateRef.current.points.slice(-overlapPoints);
    }
  }, []);

  // Check if current session meets minimum duration
  const isValidDuration = useCallback(() => {
    return stateRef.current.duration >= MIN_SESSION_DURATION;
  }, []);

  // Check if session has enough points
  const isValidPoints = useCallback(() => {
    // Count actual points from all chunks (exclude boundary markers)
    const frozenCount = stateRef.current.frozenChunks.reduce(
      (sum, chunk) => sum + chunk.filter((p) => p.t !== -1).length,
      0
    );
    const activeCount = stateRef.current.points.filter((p) => p.t !== -1).length;
    return frozenCount + activeCount >= 5;
  }, []);

  // Get current state (for UI updates)
  const getState = useCallback(() => {
    return { ...stateRef.current };
  }, []);

  // Get all points combined (for submission)
  const getAllPoints = useCallback((): TrailPoint[] => {
    const allChunks = [...stateRef.current.frozenChunks, stateRef.current.points];
    return allChunks.flat();
  }, []);

  // Get current drawing state
  const getDrawingState = useCallback((): DrawingState => {
    return stateRef.current.drawingState;
  }, []);

  // Set the sector ID
  const setSectorId = useCallback((sectorId: number) => {
    stateRef.current.sectorId = sectorId;
  }, []);

  return {
    // Multi-stroke functions (new)
    startStroke,
    endStroke,
    finishSession,
    resetSession,
    getDrawingState,
    isValidPoints,
    // Legacy aliases for backward compatibility
    startRecording: startStroke,
    stopRecording: finishSession,
    // Shared functions
    recordPoint,
    isValidDuration,
    getState,
    getAllPoints, // Get all points for submission (frozen + active)
    setSectorId,
    MIN_SESSION_DURATION,
  };
}
