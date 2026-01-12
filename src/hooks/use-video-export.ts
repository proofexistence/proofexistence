'use client';

import { useState, useCallback, useRef } from 'react';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface WatermarkInfo {
  title?: string; // e.g., "My Proof Title"
  username?: string; // e.g., "@username"
  siteUrl?: string; // e.g., "proofexistence.com"
}

export interface VideoExportOptions {
  /** Target playback speed for export (default: 2x for faster export) */
  playbackSpeed?: number;
  /** Video bitrate in bps (default: 2.5Mbps) */
  videoBitsPerSecond?: number;
  /** Watermark info to overlay on the video */
  watermark?: WatermarkInfo;
}

export interface VideoExportState {
  isExporting: boolean;
  progress: number; // 0-1
  error: string | null;
  status: string;
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

const DEFAULT_OPTIONS: Omit<Required<VideoExportOptions>, 'watermark'> = {
  playbackSpeed: 2,
  videoBitsPerSecond: 2500000, // 2.5 Mbps
};

/**
 * Check if WebCodecs API is available for MP4 encoding
 */
function isWebCodecsSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
  );
}

/**
 * Hook for exporting trail playback as MP4 video
 *
 * Uses WebCodecs API + mp4-muxer for native MP4 encoding.
 * Falls back to WebM if WebCodecs is not available.
 *
 * Benefits:
 * - Native MP4 output (H.264) - compatible with X/Twitter, Instagram, etc.
 * - No FFmpeg WASM overhead
 * - Smaller file size than GIF
 */
export function useVideoExport(): UseVideoExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const cancelledRef = useRef(false);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
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
      const { playbackSpeed, videoBitsPerSecond, watermark } = opts;

      // Reset state
      setIsExporting(true);

      // Load logo as ImageBitmap (required for OffscreenCanvas)
      let logoBitmap: ImageBitmap | null = null;
      try {
        const response = await fetch('/proof_existence_logo.png');
        const blob = await response.blob();
        logoBitmap = await createImageBitmap(blob);
        console.log(
          '[VideoExport] Logo loaded:',
          logoBitmap.width,
          'x',
          logoBitmap.height
        );
      } catch (e) {
        console.warn('[VideoExport] Could not load logo:', e);
      }
      setProgress(0);
      setError(null);
      setStatus('Preparing...');
      cancelledRef.current = false;

      // Check WebCodecs support
      if (!isWebCodecsSupported()) {
        setError(
          'Your browser does not support MP4 encoding. Please use Chrome or Edge.'
        );
        setIsExporting(false);
        return null;
      }

      try {
        // H.264 requires even dimensions
        const width = Math.floor(canvasElement.width / 2) * 2;
        const height = Math.floor(canvasElement.height / 2) * 2;
        const fps = 30;
        const recordingDuration = durationMs / playbackSpeed;
        const totalFrames = Math.ceil((recordingDuration / 1000) * fps);

        console.log('[VideoExport] Starting MP4 export:', {
          width,
          height,
          fps,
          totalFrames,
          recordingDuration,
        });

        // Create MP4 muxer
        const muxer = new Muxer({
          target: new ArrayBufferTarget(),
          video: {
            codec: 'avc',
            width,
            height,
          },
          fastStart: 'in-memory',
        });

        // Create video encoder
        const encoder = new VideoEncoder({
          output: (chunk, meta) => {
            muxer.addVideoChunk(chunk, meta);
          },
          error: (e) => {
            console.error('[VideoExport] Encoder error:', e);
          },
        });

        // Configure encoder for H.264
        // Use High Profile Level 5.1 to support high resolutions (up to 4K)
        await encoder.configure({
          codec: 'avc1.640033', // H.264 High Profile Level 5.1
          width,
          height,
          bitrate: videoBitsPerSecond,
          framerate: fps,
        });

        setStatus('Recording...');

        // Start from beginning
        seekToStart();
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // Start animation playback
        playAnimation(playbackSpeed);

        // Always create offscreen canvas for watermark drawing
        const offscreenCanvas = new OffscreenCanvas(width, height);
        const offscreenCtx = offscreenCanvas.getContext('2d');
        if (!offscreenCtx) {
          throw new Error('Failed to get offscreen canvas context');
        }

        // Helper function to draw watermarks on a canvas context
        const drawWatermarks = (
          ctx: OffscreenCanvasRenderingContext2D,
          w: number
        ) => {
          if (!watermark) return;

          const { title, username, siteUrl } = watermark;
          const padding = 24;
          const logoHeight = 32;
          const titleFontSize = 16;
          const textFontSize = 14;

          ctx.textBaseline = 'top';

          let y = padding;

          // Line 1: Logo centered at top right area
          let logoWidth = logoHeight;
          if (logoBitmap) {
            const aspectRatio = logoBitmap.width / logoBitmap.height;
            logoWidth = logoHeight * aspectRatio;
            const logoX = w - padding - logoWidth / 2 - 40; // Centered in right area
            ctx.drawImage(logoBitmap, logoX, y, logoWidth, logoHeight);
          }

          y += logoHeight + 10;

          // Line 2: Title
          if (title) {
            ctx.font = `bold ${titleFontSize}px Arial, sans-serif`;
            ctx.textAlign = 'right';
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillText(title, w - padding + 1, y + 1);
            // Main text
            ctx.fillStyle = 'white';
            ctx.fillText(title, w - padding, y);
            y += titleFontSize + 6;
          }

          // Line 3: Username
          if (username) {
            ctx.font = `${textFontSize}px Arial, sans-serif`;
            ctx.textAlign = 'right';
            const displayUsername = username.startsWith('@')
              ? username
              : `@${username}`;
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillText(displayUsername, w - padding + 1, y + 1);
            // Main text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(displayUsername, w - padding, y);
            y += textFontSize + 6;
          }

          // Line 4: Site URL
          if (siteUrl) {
            ctx.font = `${textFontSize}px Arial, sans-serif`;
            ctx.textAlign = 'right';
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillText(siteUrl, w - padding + 1, y + 1);
            // Main text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(siteUrl, w - padding, y);
          }
        };

        // Capture frames
        const frameInterval = 1000 / fps;
        let frameCount = 0;
        const startTime = Date.now();

        const captureFrame = (): Promise<void> => {
          return new Promise((resolve) => {
            if (cancelledRef.current || frameCount >= totalFrames) {
              resolve();
              return;
            }

            // Draw source canvas to offscreen canvas
            offscreenCtx.drawImage(canvasElement, 0, 0, width, height);

            // Draw watermarks on top
            drawWatermarks(offscreenCtx, width);

            const frame = new VideoFrame(offscreenCanvas, {
              timestamp: frameCount * frameInterval * 1000, // microseconds
            });

            encoder.encode(frame, { keyFrame: frameCount % 30 === 0 });
            frame.close();

            frameCount++;
            setProgress(frameCount / totalFrames);

            // Schedule next frame
            const elapsed = Date.now() - startTime;
            const expectedTime = frameCount * (frameInterval / playbackSpeed);
            const delay = Math.max(0, expectedTime - elapsed);

            setTimeout(() => {
              requestAnimationFrame(() => resolve());
            }, delay);
          });
        };

        // Capture all frames sequentially
        while (frameCount < totalFrames && !cancelledRef.current) {
          await captureFrame();
        }

        // Stop animation
        pauseAnimation();

        if (cancelledRef.current) {
          encoder.close();
          setIsExporting(false);
          setStatus('');
          return null;
        }

        setStatus('Finalizing...');

        // Flush encoder and finalize muxer
        await encoder.flush();
        encoder.close();
        muxer.finalize();

        // Get the MP4 buffer
        const { buffer } = muxer.target as ArrayBufferTarget;
        const blob = new Blob([buffer], { type: 'video/mp4' });

        console.log('[VideoExport] MP4 created:', blob.size, 'bytes');

        setIsExporting(false);
        setProgress(1);
        setStatus('');
        return blob;
      } catch (err) {
        console.error('[VideoExport] Export error:', err);
        pauseAnimation();

        if (cancelledRef.current) {
          setIsExporting(false);
          setStatus('');
          return null;
        }

        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        setIsExporting(false);
        setStatus('');
        return null;
      }
    },
    []
  );

  return {
    isExporting,
    progress,
    error,
    status,
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
  return 'mp4';
}
