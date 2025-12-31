'use client';

import { useRef, useCallback } from 'react';
import {
  TrailPoint,
  SessionState,
  MIN_SESSION_DURATION,
} from '@/types/session';

const INITIAL_STATE: SessionState = {
  isRecording: false,
  startTime: null,
  duration: 0,
  points: [],
  sectorId: 1, // Default sector
};

export function useTrailRecorder() {
  const stateRef = useRef<SessionState>(INITIAL_STATE);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording a new session
  const startRecording = useCallback(() => {
    stateRef.current = {
      ...INITIAL_STATE,
      isRecording: true,
      startTime: Date.now(),
      points: [],
    };

    // Update duration every 100ms
    intervalRef.current = setInterval(() => {
      if (stateRef.current.startTime) {
        stateRef.current.duration =
          (Date.now() - stateRef.current.startTime) / 1000;
      }
    }, 100);

    return stateRef.current;
  }, []);

  // Stop recording and return the session data
  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const finalState = { ...stateRef.current };
    finalState.isRecording = false;

    if (finalState.startTime) {
      finalState.duration = (Date.now() - finalState.startTime) / 1000;
    }

    stateRef.current = INITIAL_STATE;
    return finalState;
  }, []);

  // Record a new trail point (called on mouse/touch move)
  const recordPoint = useCallback((x: number, y: number, z: number = 0) => {
    if (!stateRef.current.isRecording || !stateRef.current.startTime) return;

    const point: TrailPoint = {
      x,
      y,
      z,
      t: Date.now() - stateRef.current.startTime,
    };

    stateRef.current.points.push(point);
  }, []);

  // Check if current session meets minimum duration
  const isValidDuration = useCallback(() => {
    return stateRef.current.duration >= MIN_SESSION_DURATION;
  }, []);

  // Get current state (for UI updates)
  const getState = useCallback(() => {
    return { ...stateRef.current };
  }, []);

  // Set the sector ID
  const setSectorId = useCallback((sectorId: number) => {
    stateRef.current.sectorId = sectorId;
  }, []);

  return {
    startRecording,
    stopRecording,
    recordPoint,
    isValidDuration,
    getState,
    setSectorId,
    MIN_SESSION_DURATION,
  };
}
