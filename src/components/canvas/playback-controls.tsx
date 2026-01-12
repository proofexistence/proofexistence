'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  X,
  RotateCcw,
  Loader2,
  Video,
  Download,
} from 'lucide-react';
import { UseTrailPlaybackReturn } from '@/hooks/use-trail-playback';

interface PlaybackControlsProps {
  playback: UseTrailPlaybackReturn;
  onExit?: () => void;
  onExportVideo?: () => void;
  isExporting?: boolean;
  exportProgress?: number;
  exportStatus?: string;
}

// Format time in mm:ss format
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Speed options
const SPEED_OPTIONS = [0.5, 1, 2, 4];

export function PlaybackControls({
  playback,
  onExit,
  onExportVideo,
  isExporting = false,
  exportProgress = 0,
  exportStatus = '',
}: PlaybackControlsProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const {
    isPlaying,
    currentTime,
    duration,
    speed,
    progress,
    toggle,
    seekProgress,
    setSpeed,
    reset,
  } = playback;

  // Handle slider interaction
  const handleSliderClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newProgress = Math.max(0, Math.min(1, x / rect.width));
      seekProgress(newProgress);
    },
    [seekProgress]
  );

  const handleSliderDrag = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!sliderRef.current || !isDragging) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const newProgress = Math.max(0, Math.min(1, x / rect.width));
      seekProgress(newProgress);
    },
    [isDragging, seekProgress]
  );

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      setIsDragging(true);
      // Immediately seek to click position
      if (sliderRef.current) {
        const rect = sliderRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        const newProgress = Math.max(0, Math.min(1, x / rect.width));
        seekProgress(newProgress);
      }
    },
    [seekProgress]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse/touch event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleSliderDrag(e);
      const handleUp = () => handleDragEnd();

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);

      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleUp);
      };
    }
  }, [isDragging, handleSliderDrag, handleDragEnd]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          toggle();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekProgress(Math.max(0, progress - 0.05));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekProgress(Math.min(1, progress + 0.05));
          break;
        case 'KeyR':
          e.preventDefault();
          reset();
          break;
        case 'Escape':
          e.preventDefault();
          onExit?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, seekProgress, progress, reset, onExit]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Controls Bar */}
      <div className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <div className="bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 p-4 shadow-2xl">
            {/* Progress Slider */}
            <div
              ref={sliderRef}
              className="relative h-2 bg-white/10 rounded-full cursor-pointer mb-4 group"
              onClick={handleSliderClick}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              {/* Progress Fill */}
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-75"
                style={{ width: `${progress * 100}%` }}
              />
              {/* Drag Handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-75 group-hover:scale-110"
                style={{ left: `calc(${progress * 100}% - 8px)` }}
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-4">
              {/* Left: Time Display */}
              <div className="text-white/60 text-sm font-mono min-w-[100px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* Center: Main Controls */}
              <div className="flex items-center gap-2">
                {/* Speed Control */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-3 py-1.5 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {speed}x
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden">
                      {SPEED_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setSpeed(s);
                            setShowSpeedMenu(false);
                          }}
                          className={`block w-full px-4 py-2 text-sm text-left transition-colors ${
                            speed === s
                              ? 'bg-purple-500/30 text-white'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reset Button */}
                <button
                  onClick={reset}
                  className="p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Reset (R)"
                >
                  <RotateCcw size={18} />
                </button>

                {/* Play/Pause Button */}
                <button
                  onClick={toggle}
                  className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:brightness-110 text-white rounded-full shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? (
                    <Pause size={24} />
                  ) : (
                    <Play size={24} className="ml-0.5" />
                  )}
                </button>

                {/* Video Export Button */}
                {onExportVideo && (
                  <button
                    onClick={onExportVideo}
                    disabled={isExporting}
                    className="relative px-3 py-1.5 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:cursor-wait flex items-center gap-1.5 overflow-hidden"
                    title="Export Video (WebM/MP4)"
                  >
                    {isExporting && (
                      <div
                        className="absolute inset-0 bg-purple-500/30 transition-all"
                        style={{ width: `${exportProgress * 100}%` }}
                      />
                    )}
                    <span className="relative flex items-center gap-1.5">
                      {isExporting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>
                            {exportStatus ||
                              `${Math.round(exportProgress * 100)}%`}
                          </span>
                        </>
                      ) : (
                        <>
                          <Video size={14} />
                          <span>MP4</span>
                          <Download size={12} />
                        </>
                      )}
                    </span>
                  </button>
                )}
              </div>

              {/* Right: Exit Button */}
              <div className="min-w-[100px] flex justify-end">
                {onExit && (
                  <button
                    onClick={onExit}
                    className="p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                    title="Exit Playback (Esc)"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Keyboard Hints */}
            <div className="hidden md:flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/5">
              <span className="text-white/30 text-xs">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                  Space
                </kbd>{' '}
                Play/Pause
              </span>
              <span className="text-white/30 text-xs">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                  ←
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] ml-0.5">
                  →
                </kbd>{' '}
                Seek
              </span>
              <span className="text-white/30 text-xs">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                  R
                </kbd>{' '}
                Reset
              </span>
              <span className="text-white/30 text-xs">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                  Esc
                </kbd>{' '}
                Exit
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
