'use client';

import { useState, useCallback, useRef } from 'react';
import { TrailPoint } from '@/types/session';

export interface GifExportOptions {
  fps?: number;
  width?: number;
  height?: number;
  quality?: number;
  maxDurationMs?: number;
}

export interface GifExportState {
  isExporting: boolean;
  progress: number; // 0-1
  error: string | null;
}

export interface UseGifExportReturn extends GifExportState {
  exportGif: (
    canvasElement: HTMLCanvasElement,
    trailData: TrailPoint[],
    renderFrame: (timeMs: number) => Promise<void>,
    options?: GifExportOptions
  ) => Promise<Blob | null>;
  cancelExport: () => void;
}

const DEFAULT_OPTIONS: Required<GifExportOptions> = {
  fps: 15,
  width: 480,
  height: 480,
  quality: 10,
  maxDurationMs: 10000,
};

/**
 * Calculate the total duration of the trail from its timestamps
 */
function calculateDuration(trailData: TrailPoint[]): number {
  let maxTime = 0;
  for (const point of trailData) {
    if (point.t !== -1 && point.t > maxTime) {
      maxTime = point.t;
    }
  }
  return maxTime;
}

/**
 * Hook for exporting trail playback as GIF
 *
 * Usage:
 * 1. Install gif.js: `bun add gif.js @types/gif.js`
 * 2. Copy gif.worker.js to public folder
 * 3. Use this hook with PlaybackCanvas
 *
 * Note: This is a simplified implementation that captures frames
 * from a 2D canvas. For Three.js scenes, the canvas needs to be
 * captured using gl.domElement.
 */
export function useGifExport(): UseGifExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const exportGif = useCallback(
    async (
      canvasElement: HTMLCanvasElement,
      trailData: TrailPoint[],
      renderFrame: (timeMs: number) => Promise<void>,
      options?: GifExportOptions
    ): Promise<Blob | null> => {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const { fps, width, height, quality, maxDurationMs } = opts;

      // Reset state
      setIsExporting(true);
      setProgress(0);
      setError(null);
      cancelledRef.current = false;

      try {
        // Dynamic import of gif.js to avoid SSR issues
        const GIF = (await import('gif.js')).default;

        // Calculate duration
        const trailDuration = calculateDuration(trailData);
        const duration = Math.min(trailDuration, maxDurationMs);
        const frameCount = Math.ceil((duration / 1000) * fps);
        const frameDelay = 1000 / fps;

        // Create GIF encoder
        const gif = new GIF({
          workers: 2,
          quality,
          width,
          height,
          workerScript: '/gif.worker.js',
        });

        // Create a temporary canvas for scaling
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          throw new Error('Failed to create temporary canvas context');
        }

        // Capture frames
        for (let i = 0; i < frameCount; i++) {
          if (cancelledRef.current) {
            throw new Error('Export cancelled');
          }

          const time = (i / fps) * 1000;

          // Render the frame at this time
          await renderFrame(time);

          // Wait for the canvas to update
          await new Promise((resolve) => requestAnimationFrame(resolve));

          // Scale and draw to temp canvas
          tempCtx.fillStyle = '#050508';
          tempCtx.fillRect(0, 0, width, height);

          // Calculate scaling to maintain aspect ratio (center crop)
          const sourceSize = Math.min(
            canvasElement.width,
            canvasElement.height
          );
          const sourceX = (canvasElement.width - sourceSize) / 2;
          const sourceY = (canvasElement.height - sourceSize) / 2;

          tempCtx.drawImage(
            canvasElement,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            width,
            height
          );

          // Add frame to GIF
          gif.addFrame(tempCanvas, { delay: frameDelay, copy: true });

          // Update progress
          setProgress((i + 1) / frameCount);
        }

        // Generate GIF
        return new Promise((resolve, reject) => {
          gif.on('finished', (blob: Blob) => {
            setIsExporting(false);
            setProgress(1);
            resolve(blob);
          });

          // The types don't include 'error' event but gif.js does emit it
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (gif as any).on('error', (err: Error) => {
            setIsExporting(false);
            setError(err.message);
            reject(err);
          });

          gif.render();
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setIsExporting(false);

        // If gif.js is not installed, provide helpful message
        if (
          message.includes('Cannot find module') ||
          message.includes('gif.js')
        ) {
          console.error(
            'GIF export requires gif.js library. Install it with: bun add gif.js @types/gif.js'
          );
        }

        return null;
      }
    },
    []
  );

  return {
    isExporting,
    progress,
    error,
    exportGif,
    cancelExport,
  };
}

/**
 * Helper function to download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
