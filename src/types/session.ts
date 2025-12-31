// Trail point data structure for recording cursor movements
export interface TrailPoint {
  x: number;
  y: number;
  z: number;
  t: number; // timestamp in ms from session start
}

// Session state for managing light trail recording
export interface SessionState {
  isRecording: boolean;
  startTime: number | null;
  duration: number; // in seconds
  points: TrailPoint[];
  sectorId: number;
}

// Minimum duration for a valid session (10 seconds)
export const MIN_SESSION_DURATION = 10;

// Session status matching database schema
export const SESSION_STATUS = {
  PENDING: 'PENDING',
  SETTLED: 'SETTLED',
  MINTED: 'MINTED',
} as const;

export type SessionStatus =
  (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

// Submission payload for the API
export interface SessionSubmission {
  duration: number;
  sectorId: number;
  trailData: TrailPoint[];
  proofType: 'standard' | 'instant';
}

// Submission result from the API
export interface SubmissionResult {
  success: boolean;
  sessionId?: string;
  txHash?: string; // Only for instant proof
  message: string;
}
