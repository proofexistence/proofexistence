'use client';

import React, { useState, useCallback, useRef } from 'react';
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
  /** Max dimension (width or height) in pixels (default: 1920) */
  maxDimension?: number;
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
    seekToTime: (timeMs: number) => void,
    options?: VideoExportOptions
  ) => Promise<Blob | null>;
  cancelExport: () => void;
}

const DEFAULT_OPTIONS: Omit<Required<VideoExportOptions>, 'watermark'> = {
  playbackSpeed: 2,
  videoBitsPerSecond: 2500000, // 2.5 Mbps
  maxDimension: 1920,
};

/**
 * Check if WebCodecs API is available for MP4 encoding
 * Note: iOS/iPadOS reports partial WebCodecs support but doesn't work reliably
 */
function isWebCodecsSupported(): boolean {
  // Skip WebCodecs on iOS/iPadOS - it's not reliable even if APIs exist
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS) return false;

  return (
    typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
  );
}

/**
 * Check if MediaRecorder is available for video recording (fallback)
 */
function isMediaRecorderSupported(): boolean {
  if (typeof MediaRecorder === 'undefined') return false;
  // Check if video recording is supported (WebM or MP4)
  try {
    return (
      MediaRecorder.isTypeSupported('video/webm') ||
      MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ||
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
      MediaRecorder.isTypeSupported('video/mp4')
    );
  } catch {
    return false;
  }
}

/**
 * Get supported MIME type for MediaRecorder
 */
function getSupportedMimeType(): string | null {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4', // Safari might support mp4
  ];
  for (const type of types) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      // isTypeSupported might throw on some browsers
      continue;
    }
  }
  return null;
}

/**
 * MediaRecorder-based export (WebM format) - fallback for browsers without WebCodecs
 */
async function exportWithMediaRecorder(
  canvasElement: HTMLCanvasElement,
  durationMs: number,
  playbackSpeed: number,
  videoBitsPerSecond: number,
  playAnimation: (speed: number) => void,
  pauseAnimation: () => void,
  seekToTime: (timeMs: number) => void,
  setProgress: (p: number) => void,
  setStatus: (s: string) => void,
  cancelledRef: React.MutableRefObject<boolean>
): Promise<Blob | null> {
  const mimeType = getSupportedMimeType();
  if (!mimeType) {
    throw new Error('No supported video format found');
  }

  console.log('[VideoExport] Using MediaRecorder fallback with:', mimeType);

  // Get canvas stream - may fail on some browsers with WebGL canvas
  let stream: MediaStream;
  try {
    stream = canvasElement.captureStream(30);
    if (!stream || stream.getVideoTracks().length === 0) {
      throw new Error('Failed to capture video stream from canvas');
    }
  } catch (e) {
    console.error('[VideoExport] captureStream failed:', e);
    throw new Error('Video recording is not supported on this device');
  }

  return new Promise((resolve, reject) => {
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond,
      });
    } catch (e) {
      console.error('[VideoExport] MediaRecorder creation failed:', e);
      reject(new Error('Video recording is not supported on this device'));
      return;
    }

    const chunks: Blob[] = [];
    const recordingDuration = durationMs / playbackSpeed;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      pauseAnimation();
      if (cancelledRef.current) {
        resolve(null);
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      console.log('[VideoExport] WebM created:', blob.size, 'bytes');
      resolve(blob);
    };

    mediaRecorder.onerror = () => {
      pauseAnimation();
      reject(new Error('Recording failed'));
    };

    // Start from beginning
    seekToTime(0);

    // Small delay to ensure seek is applied
    setTimeout(() => {
      setStatus('Recording...');
      mediaRecorder.start(100);
      playAnimation(playbackSpeed);

      // Update progress
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        if (cancelledRef.current) {
          clearInterval(progressInterval);
          mediaRecorder.stop();
          return;
        }
        const elapsed = Date.now() - startTime;
        setProgress(Math.min(elapsed / recordingDuration, 0.99));
      }, 100);

      // Stop after duration
      setTimeout(() => {
        clearInterval(progressInterval);
        if (mediaRecorder.state !== 'inactive') {
          setStatus('Finalizing...');
          setProgress(1);
          mediaRecorder.stop();
        }
      }, recordingDuration + 500);
    }, 100);
  });
}

/**
 * Hook for exporting trail playback as MP4 video
 *
 * Uses WebCodecs API + mp4-muxer for native MP4 encoding.
 * Falls back to WebM via MediaRecorder if WebCodecs is not available.
 *
 * Benefits:
 * - Native MP4 output (H.264) - compatible with X/Twitter, Instagram, etc.
 * - WebM fallback for iOS Safari
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
      seekToTime: (timeMs: number) => void,
      options?: VideoExportOptions
    ): Promise<Blob | null> => {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const { playbackSpeed, videoBitsPerSecond, watermark, maxDimension } =
        opts;

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

      // Check codec support - prefer WebCodecs, fallback to MediaRecorder
      const useWebCodecs = isWebCodecsSupported();
      const useMediaRecorder = !useWebCodecs && isMediaRecorderSupported();

      if (!useWebCodecs && !useMediaRecorder) {
        setError(
          'Video export is not supported on this browser. Please use Chrome, Edge, or a newer Safari.'
        );
        setIsExporting(false);
        return null;
      }

      try {
        // Use MediaRecorder fallback for browsers without WebCodecs (e.g., iOS Safari)
        if (useMediaRecorder) {
          return await exportWithMediaRecorder(
            canvasElement,
            durationMs,
            playbackSpeed,
            videoBitsPerSecond,
            playAnimation,
            pauseAnimation,
            seekToTime,
            setProgress,
            setStatus,
            cancelledRef
          );
        }

        // WebCodecs path (MP4)
        // Calculate dimensions with aspect ratio preservation and max limits
        let width = canvasElement.width;
        let height = canvasElement.height;
        const aspect = width / height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            width = maxDimension;
            height = Math.round(width / aspect);
          } else {
            height = maxDimension;
            width = Math.round(height * aspect);
          }
        }

        // Ensure even dimensions for H.264
        width = Math.floor(width / 2) * 2;
        height = Math.floor(height / 2) * 2;

        const fps = 30;
        const recordingDuration = durationMs; // Real duration
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
        await encoder.configure({
          codec: 'avc1.640033', // H.264 High Profile Level 5.1
          width,
          height,
          bitrate: videoBitsPerSecond,
          framerate: fps,
        });

        setStatus('Recording...');

        // Pause animation for controlled seeking
        pauseAnimation();

        // Always create offscreen canvas for resizing and watermark drawing
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

        // Capture frames synchronously (conceptually) by seeking
        const frameInterval = 1000 / fps; // 33.33ms

        for (let i = 0; i < totalFrames; i++) {
          if (cancelledRef.current) break;

          const currentTime = i * frameInterval;
          seekToTime(currentTime);

          // Wait for a few frames to let React and Three.js update the canvas
          // We need to wait for the visual update to be reflected on the canvas
          // 2 frames is generally safe (one for React commit, one for WebGL render)
          await new Promise((resolve) => requestAnimationFrame(resolve));
          await new Promise((resolve) => requestAnimationFrame(resolve));

          // Draw source canvas to offscreen canvas (resizing it)
          offscreenCtx.drawImage(canvasElement, 0, 0, width, height);

          // Draw watermarks on top
          drawWatermarks(offscreenCtx, width);

          const frame = new VideoFrame(offscreenCanvas, {
            timestamp: i * frameInterval * 1000, // microseconds
          });

          encoder.encode(frame, { keyFrame: i % 30 === 0 });
          frame.close();

          setProgress(i / totalFrames);
        }

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
 * Returns: 'shared' | 'downloaded' | 'opened' | 'cancelled'
 */
export async function downloadVideoBlob(
  blob: Blob,
  filename: string
): Promise<'shared' | 'downloaded' | 'opened' | 'cancelled'> {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;

  // Try Web Share API first (works well on Android, sometimes on iOS)
  if (isMobile && navigator.canShare && navigator.share) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Proof Replay',
        });
        return 'shared';
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return 'cancelled';
      }
      console.warn('[VideoExport] Share failed, trying fallback:', e);
    }
  }

  // iOS fallback: open in new tab for long-press save
  if (isIOS) {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Don't revoke immediately - user needs time to save
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return 'opened';
  }

  // Desktop/Android fallback: anchor element download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return 'downloaded';
}

/**
 * Get file extension from MIME type
 */
export function getVideoExtension(blob: Blob): string {
  if (blob.type.includes('mp4')) return 'mp4';
  if (blob.type.includes('webm')) return 'webm';
  return 'mp4';
}
