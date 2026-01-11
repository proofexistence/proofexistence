'use client';

import { useState, useCallback, useRef } from 'react';

export interface VideoExportOptions {
  /** Target playback speed for export (default: 2x for faster export) */
  playbackSpeed?: number;
  /** Video bitrate in bps (default: 2.5Mbps) */
  videoBitsPerSecond?: number;
}

export interface VideoExportState {
  isExporting: boolean;
  progress: number; // 0-1
  error: string | null;
}

export interface UseVideoExportReturn extends VideoExportState {
  exportVideo: (
    canvasElement: HTMLCanvasElement,
    durationMs: number,
    playAnimation: (speed: number) => void,
    pauseAnimation: () => void,
    seekToStart: () => void,
    options?: VideoExportOptions
  ) => Promise<Blob | null>;
  cancelExport: () => void;
}

const DEFAULT_OPTIONS: Required<VideoExportOptions> = {
  playbackSpeed: 2,
  videoBitsPerSecond: 2500000, // 2.5 Mbps
};

/**
 * Get supported MIME type for video recording
 */
function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

/**
 * Hook for exporting trail playback as video (WebM/MP4)
 *
 * Uses the native MediaRecorder API for efficient video encoding.
 * Output is typically WebM on Chrome/Firefox, MP4 on Safari.
 *
 * Benefits over GIF:
 * - 5-10x smaller file size
 * - Better quality (no 256 color limit)
 * - No duration limit
 */
export function useVideoExport(): UseVideoExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const exportVideo = useCallback(
    async (
      canvasElement: HTMLCanvasElement,
      durationMs: number,
      playAnimation: (speed: number) => void,
      pauseAnimation: () => void,
      seekToStart: () => void,
      options?: VideoExportOptions
    ): Promise<Blob | null> => {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const { playbackSpeed, videoBitsPerSecond } = opts;

      // Reset state
      setIsExporting(true);
      setProgress(0);
      setError(null);
      cancelledRef.current = false;

      try {
        // Check for MediaRecorder support
        if (!window.MediaRecorder) {
          throw new Error('MediaRecorder not supported in this browser');
        }

        // Get canvas stream (30fps)
        const stream = canvasElement.captureStream(30);

        // Get supported MIME type
        const mimeType = getSupportedMimeType();

        // Create MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond,
        });
        mediaRecorderRef.current = mediaRecorder;

        const chunks: Blob[] = [];

        // Collect recorded data
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        // Calculate recording duration (at playback speed)
        const recordingDuration = durationMs / playbackSpeed;

        // Start from beginning
        seekToStart();

        // Wait a frame for seek to apply
        await new Promise((resolve) => requestAnimationFrame(resolve));

        return new Promise((resolve, reject) => {
          // Handle recording complete
          mediaRecorder.onstop = () => {
            pauseAnimation();

            if (cancelledRef.current) {
              setIsExporting(false);
              resolve(null);
              return;
            }

            // Create blob from chunks
            const blob = new Blob(chunks, { type: mimeType });
            setIsExporting(false);
            setProgress(1);
            resolve(blob);
          };

          // Handle errors
          mediaRecorder.onerror = () => {
            pauseAnimation();
            const errorMessage = 'Recording failed';
            setError(errorMessage);
            setIsExporting(false);
            reject(new Error(errorMessage));
          };

          // Start recording
          mediaRecorder.start(100); // Collect data every 100ms

          // Start animation playback
          playAnimation(playbackSpeed);

          // Update progress during recording
          const startTime = Date.now();
          const progressInterval = setInterval(() => {
            if (cancelledRef.current) {
              clearInterval(progressInterval);
              return;
            }

            const elapsed = Date.now() - startTime;
            const currentProgress = Math.min(elapsed / recordingDuration, 0.99);
            setProgress(currentProgress);
          }, 100);

          // Stop recording after duration
          setTimeout(() => {
            clearInterval(progressInterval);
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, recordingDuration + 500); // Add small buffer
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setIsExporting(false);
        return null;
      }
    },
    []
  );

  return {
    isExporting,
    progress,
    error,
    exportVideo,
    cancelExport,
  };
}

/**
 * Helper function to download a blob as a file
 */
export function downloadVideoBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Get file extension from MIME type
 */
export function getVideoExtension(blob: Blob): string {
  if (blob.type.includes('mp4')) return 'mp4';
  if (blob.type.includes('webm')) return 'webm';
  return 'webm';
}
