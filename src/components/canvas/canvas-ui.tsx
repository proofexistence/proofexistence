'use client';

import { TRAIL_COLORS } from './light-trail';
import { MIN_SESSION_DURATION } from '@/types/session';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ProofOptionCard } from './proof-option-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

// -- Helper: Format Time --
export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// -- Component: Timer Display --
interface TimerDisplayProps {
  duration: number;
  isRecording: boolean;
  isValid: boolean;
  isPaused?: boolean;
  onClear?: () => void;
  onFinish?: () => void;
}

export function TimerDisplay({
  duration,
  isRecording,
  isValid,
  isPaused = false,
  onClear,
  onFinish,
}: TimerDisplayProps) {
  const t = useTranslations('canvas');
  const getIndicatorClass = () => {
    if (isPaused)
      return 'bg-amber-500 animate-pulse shadow-lg shadow-amber-500/50';
    if (!isRecording) return 'bg-gray-500';
    if (isValid)
      return 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50';
    return 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50';
  };

  // When paused, show expanded timer with controls
  if (isPaused) {
    return (
      <div className="absolute top-6 md:top-8 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl px-3 py-2 md:px-4 md:py-3 border border-amber-500/20 shadow-lg shadow-amber-500/10 transition-all duration-300 animate-in fade-in zoom-in-95">
          {/* Timer row */}
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div
              className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border border-white/30 transition-colors duration-300 ${getIndicatorClass()}`}
            />
            <span className="text-white font-mono text-sm md:text-lg tracking-wider">
              {formatTime(duration)}
            </span>
            <span className="text-amber-300 text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 bg-amber-500/20 rounded-full">
              {t('timer.paused')}
            </span>
          </div>
          {/* Hint text - hidden on mobile to save space */}
          <p className="hidden md:block text-white/40 text-[10px] text-center mb-3">
            {t('timer.clickToContinue')}
            {!isValid &&
              ` • ${t('timer.minDuration', { seconds: MIN_SESSION_DURATION })}`}
          </p>
          {/* Buttons row */}
          <div className="flex gap-1.5 md:gap-2 justify-center">
            {onClear && (
              <button
                onClick={onClear}
                className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-medium
                  bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white
                  backdrop-blur-md transition-all active:scale-95"
              >
                <svg
                  className="w-3 h-3 md:w-3.5 md:h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="hidden md:inline">{t('actions.restart')}</span>
              </button>
            )}
            {onFinish && (
              <button
                onClick={onFinish}
                disabled={!isValid}
                className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-medium
                  backdrop-blur-md transition-all
                  ${
                    isValid
                      ? 'bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 active:scale-95'
                      : 'bg-zinc-800/50 border border-zinc-700/30 text-zinc-500 cursor-not-allowed opacity-50'
                  }`}
              >
                <svg
                  className="w-3 h-3 md:w-3.5 md:h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="hidden md:inline">{t('actions.done')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal timer display
  return (
    <div className="absolute top-6 md:top-8 left-1/2 -translate-x-1/2 pointer-events-none">
      <div className="bg-black/30 backdrop-blur-xl rounded-full h-10 px-4 flex items-center gap-3 border border-white/10 shadow-lg shadow-black/20 transition-all duration-300">
        <div
          className={`w-3 h-3 rounded-full border border-white/30 transition-colors duration-300 ${getIndicatorClass()}`}
        />
        <span className="text-white font-mono text-base tracking-wider min-w-[3ch] text-center">
          {formatTime(duration)}
        </span>
        {!isValid && isRecording && (
          <span className="text-yellow-300/80 text-sm font-light border-l border-white/20 pl-3">
            {t('timer.minDuration', { seconds: MIN_SESSION_DURATION })}
          </span>
        )}
      </div>
    </div>
  );
}

// -- Component: Color Picker --
interface ColorPickerProps {
  trailColor: string;
  onColorChange: (color: string) => void;
}

export function ColorPicker({ trailColor, onColorChange }: ColorPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="pointer-events-auto flex items-start md:items-center h-10">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-10 h-10 rounded-full border-2 border-white shadow-lg ring-2 ring-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ backgroundColor: trailColor }}
          aria-label="Expand Color Picker"
        />
      ) : (
        <div className="flex md:flex-row flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
          {TRAIL_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                onColorChange(c.value);
                setIsExpanded(false);
              }}
              className={`w-10 h-10 rounded-full border-2 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 ${
                trailColor === c.value
                  ? 'border-white shadow-lg ring-2 ring-white/20'
                  : 'border-white/30 hover:border-white/60'
              }`}
              style={{ backgroundColor: c.value }}
              aria-label={c.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// -- Component: Action Buttons (Clear & Submit) --
interface ActionButtonsProps {
  onClear: () => void;
  onSubmit: () => void;
}

export function ActionButtons({ onClear, onSubmit }: ActionButtonsProps) {
  const t = useTranslations('canvas');
  return (
    <div className="flex gap-2 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
      <button
        onClick={onClear}
        className="flex items-center justify-center gap-2 h-10 px-4 rounded-full font-medium text-base
          bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white
          backdrop-blur-xl transition-all active:scale-95 shadow-lg shadow-black/20"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {t('actions.restart')}
      </button>
      <button
        onClick={onSubmit}
        className="flex items-center justify-center gap-2 h-10 px-5 rounded-full font-medium text-base
          bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30
          backdrop-blur-xl transition-all shadow-lg shadow-emerald-500/10 active:scale-95"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {t('actions.submit')}
      </button>
    </div>
  );
}

// -- Component: Zoom Controls --
interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-2 pointer-events-auto animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
      <button
        onClick={onZoomIn}
        className="w-12 h-12 flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-xl text-white rounded-xl border border-white/10 hover:border-white/20 transition-all active:scale-95 shadow-lg shadow-black/20"
        aria-label="Zoom In"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
      <button
        onClick={onZoomOut}
        className="w-12 h-12 flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-xl text-white rounded-xl border border-white/10 hover:border-white/20 transition-all active:scale-95 shadow-lg shadow-black/20"
        aria-label="Zoom Out"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>
    </div>
  );
}

// -- Component: Exit Controls --
interface ExitControlsProps {
  onExit: () => void;
}

export function ExitControls({ onExit }: ExitControlsProps) {
  const t = useTranslations('canvas');
  return (
    <div className="absolute top-6 left-4 md:top-8 md:left-6 pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
      <button
        onClick={onExit}
        className="flex items-center gap-2 h-10 bg-black/30 hover:bg-black/40 backdrop-blur-xl text-white/80 hover:text-white font-medium px-4 text-base rounded-full transition-all border border-white/10 hover:border-white/20 active:scale-95 shadow-lg shadow-black/20 group"
      >
        <svg
          className="w-4 h-4 transition-transform group-hover:-translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        {t('actions.exit')}
      </button>
    </div>
  );
}

// -- Component: Instructions / Status --
interface InstructionsProps {
  isRecording: boolean;
  isReady: boolean;
  isPaused?: boolean;
  onClear?: () => void;
  onSubmit?: () => void;
  themeName?: string;
}

export function Instructions({
  isRecording,
  isReady,
  isPaused = false,
  themeName,
}: InstructionsProps) {
  const t = useTranslations('canvas');
  const tQuests = useTranslations('quests');

  // Translate theme name using quests translations
  const getTranslatedThemeName = (name: string): string => {
    const themeKey = name.toLowerCase().replace(/\s+/g, '_');
    try {
      const rawName = tQuests.raw(`themes.${themeKey}`);
      return typeof rawName === 'string' ? rawName : name;
    } catch {
      return name;
    }
  };

  const translatedThemeName = themeName ? getTranslatedThemeName(themeName) : null;
  // Position changes based on state
  // Paused state uses pointer-events-none on container so clicks pass through to canvas
  const getPositionClass = () => {
    if (isRecording) {
      return 'absolute top-24 md:top-32 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-4 w-full px-4';
    }
    if (isPaused) {
      return 'absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-4 w-full px-4';
    }
    return 'absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-4 w-full px-4';
  };

  return (
    <div className={getPositionClass()}>
      {/* Idle state - not recording, not paused, not ready */}
      {!isReady && !isRecording && !isPaused && (
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl px-6 py-4 border border-white/10 shadow-lg shadow-black/30 text-center animate-in fade-in zoom-in-95 duration-500">
          <p className="text-white text-base font-medium mb-1">
            {t('instructions.clickAndHold')}
          </p>
          <p className="text-white/50 text-xs mb-3">
            {t('instructions.drawForMinimum', {
              seconds: MIN_SESSION_DURATION,
            })}
          </p>
          <div className="pt-3 border-t border-white/5 space-y-1">
            {translatedThemeName && (
              <p className="text-purple-300/60 text-[10px] font-medium">
                {t('instructions.todayTheme', { name: translatedThemeName })}
              </p>
            )}
            <p className="text-white/20 text-[10px] font-mono">
              {t('instructions.backgroundHint')}
            </p>
          </div>
        </div>
      )}

      {/* Recording state - actively drawing */}
      {isRecording && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-black/30 backdrop-blur-xl rounded-xl px-4 py-2.5 border border-green-500/20 shadow-lg shadow-green-500/10">
            <p className="text-white/70 text-xs font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {t('instructions.recording')}
            </p>
          </div>
        </div>
      )}

      {/* Paused state - controls are now in the timer at the top */}
      {/* This section intentionally left empty - see TimerDisplay for pause controls */}

      {/* Ready state - session finished, can submit */}
      {isReady && !isRecording && (
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl px-6 py-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/10 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-cyan-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-cyan-300 text-base font-medium">
              {t('instructions.readyToSubmit')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Component: Background Overlay --
export function BackgroundOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-purple-900/20 via-transparent to-transparent blur-3xl animate-pulse-slow" />
      <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-cyan-900/20 via-transparent to-transparent blur-3xl animate-pulse-slow delay-1000" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-radial from-pink-900/10 via-transparent to-transparent blur-3xl animate-pulse-slow delay-2000" />
    </div>
  );
}

// -- Component: Clear Confirmation Modal --
interface ClearConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
}: ClearConfirmModalProps) {
  const t = useTranslations('canvas');
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-50 animate-in fade-in duration-200">
      <div
        className="bg-black/40 backdrop-blur-sm absolute inset-0"
        onClick={onCancel}
      />
      <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-lg shadow-black/30 z-10 max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-300">
        {/* Header with icon */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-amber-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <h3 className="text-white text-lg font-medium">
            {t('clearConfirm.title')}
          </h3>
        </div>
        <p className="text-white/50 text-sm text-center mb-5">
          {t('clearConfirm.description')}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium
              bg-white/10 border border-white/20 text-white/80 hover:bg-white/20 hover:text-white
              backdrop-blur-md transition-all active:scale-95"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {t('clearConfirm.keepTrail')}
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium
              bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30
              backdrop-blur-md transition-all shadow-lg shadow-cyan-500/10 active:scale-95"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {t('clearConfirm.clearStart')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment method types
export type PaymentMethod = 'NATIVE' | 'TIME26' | 'TIME26_GASLESS';

// -- Component: Submission Modal (Standard vs Instant) --
interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStandard: (data: {
    message: string;
    username: string;
    title: string;
    description: string;
    markAsTheme?: boolean;
  }) => void;
  onSelectInstant: (data: {
    message: string;
    username: string;
    title: string;
    description: string;
    paymentMethod?: PaymentMethod;
    markAsTheme?: boolean;
  }) => void;
  isSubmitting: boolean;
  profileName?: string;
  profileUsername?: string;
  time26Balance?: string;
  polBalance?: string;
  nativeCost?: string;
  nativeCostUsd?: string;
  time26Cost?: string;
  loadingMessage?: string;
  onSetAsDisplayName?: (name: string) => Promise<void>;
  // Gasless eligibility
  gaslessEligible?: boolean;
  gaslessTotalCost?: string;
  gaslessLoading?: boolean;
  unclaimedBalance?: string;
  // Theme marking
  themeName?: string | null;
  themeCompleted?: boolean;
}

export function SubmissionModal({
  isOpen,
  onClose,
  onSelectStandard,
  onSelectInstant,
  isSubmitting,
  profileName,
  profileUsername,
  time26Balance = '0',
  polBalance = '0',
  nativeCost = '... POL',
  nativeCostUsd = '',
  time26Cost = '... TIME',
  loadingMessage,
  onSetAsDisplayName,
  gaslessEligible = false,
  gaslessTotalCost = '0',
  gaslessLoading = false,
  themeName,
  themeCompleted = false,
}: SubmissionModalProps) {
  const t = useTranslations('canvas');
  // Logic: Default to Name -> Username -> Empty (Anonymous)
  const defaultName = profileName || profileUsername || '';
  const [username, setUsername] = useState(defaultName);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState(''); // Moved up to group state
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [markAsTheme, setMarkAsTheme] = useState(false);

  // Sync username with profile name when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername(profileName || profileUsername || '');
      // Reset markAsTheme to false (user must opt-in)
      setMarkAsTheme(false);
    }
  }, [isOpen, profileName, profileUsername]);

  // Handle set as display name
  const handleSetAsDisplayName = async () => {
    if (!onSetAsDisplayName || !username.trim()) return;
    setIsSavingDisplayName(true);
    try {
      await onSetAsDisplayName(username.trim());
      setDisplayNameSaved(true);
      setTimeout(() => setDisplayNameSaved(false), 2000);
    } catch (err) {
      console.error('Failed to set display name:', err);
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  // Message history for loading overlay (shows last 3 with fading effect)
  // Message history for loading overlay
  const [messageHistory, setMessageHistory] = useState<
    { id: number; text: string }[]
  >([]);
  const prevMessageRef = useRef<string>('');
  const historyIdRef = useRef(0);

  useEffect(() => {
    if (loadingMessage && loadingMessage !== prevMessageRef.current) {
      prevMessageRef.current = loadingMessage;
      setMessageHistory((prev) => {
        const newItem = { id: ++historyIdRef.current, text: loadingMessage };
        const newHistory = [...prev, newItem];
        return newHistory.slice(-3); // Keep only last 3
      });
    } else if (!loadingMessage) {
      prevMessageRef.current = '';
    }
  }, [loadingMessage]);

  // Reset history when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMessageHistory([]);
      prevMessageRef.current = '';
    }
  }, [isOpen]);

  // Helper to sync close with onOpenChange
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Calculate TIME26 card state
  const time26CardState = useMemo(() => {
    if (gaslessEligible) return 'gasless';
    // Parse costs to compare (remove non-numeric characters)
    const balanceNum = parseFloat(time26Balance.replace(/[^0-9.]/g, '')) || 0;
    const costNum = parseFloat(time26Cost.replace(/[^0-9.]/g, '')) || 0;
    if (balanceNum >= costNum) return 'available';
    return 'insufficient';
  }, [gaslessEligible, time26Balance, time26Cost]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#0A0A0B] border-white/10 text-white shadow-2xl shadow-purple-900/20 max-w-xl w-full p-0 gap-0 rounded-3xl block overflow-hidden">
        {/* Background Glows (Inside the modal content to clip correctly) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none rounded-3xl z-0">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-purple-500/10 blur-3xl rounded-full" />
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-cyan-500/10 blur-3xl rounded-full" />
        </div>

        <div className="relative z-10 p-6 flex flex-col h-full max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <DialogHeader className="mb-5 flex-shrink-0">
            <DialogTitle className="text-2xl font-bold text-white text-center tracking-tight">
              {t('modal.title')}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-center text-sm">
              {t('modal.subtitle')}
            </DialogDescription>
          </DialogHeader>

          {/* Wrapper for Vertical Layout */}
          <div className="space-y-4 mb-4">
            {/* --- ART DETAILS SECTION (First) --- */}
            <div className="space-y-3 p-4 bg-zinc-900/40 rounded-3xl border border-white/5">
              <h4 className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 tracking-widest uppercase mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                {t('modal.artworkDetails')}
              </h4>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 ml-1">
                  {t('modal.artworkTitle')}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('modal.artworkTitlePlaceholder')}
                  maxLength={100}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-sm font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 ml-1">
                  {t('modal.description')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('modal.descriptionPlaceholder')}
                  maxLength={500}
                  rows={2}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none text-xs"
                />
              </div>
            </div>

            {/* --- IDENTITY SECTION (Second) --- */}
            <div className="space-y-3 p-4 bg-zinc-900/40 rounded-3xl border border-white/5">
              <h4 className="flex items-center gap-2 text-[10px] font-bold text-purple-400 tracking-widest uppercase mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                {t('modal.identity')}
              </h4>

              {/* 1. Name on Chain */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 ml-1">
                  {t('modal.nameOnChain')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={profileName || t('modal.namePlaceholder')}
                    maxLength={50}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono text-sm"
                  />
                  <div className="absolute right-3 top-2.5 flex items-center gap-2">
                    {profileName && username !== profileName && (
                      <button
                        onClick={() => setUsername(profileName)}
                        className="text-[10px] text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2 py-1 rounded"
                      >
                        {t('modal.reset')}
                      </button>
                    )}
                    {onSetAsDisplayName &&
                      username.trim() &&
                      username !== profileName && (
                        <button
                          onClick={handleSetAsDisplayName}
                          disabled={isSavingDisplayName}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded disabled:opacity-50"
                        >
                          {isSavingDisplayName
                            ? t('modal.saving')
                            : displayNameSaved
                              ? t('modal.saved')
                              : t('modal.setAsDisplayName')}
                        </button>
                      )}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1 ml-1">
                  {t('modal.leaveEmpty')}
                </p>
              </div>

              {/* 2. Message */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 ml-1">
                  {t('modal.messageToWorld')}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('modal.messagePlaceholder')}
                  maxLength={280}
                  rows={2}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none italic text-sm"
                />
              </div>
            </div>
          </div>

          {/* Theme Marking Option - Simpler checkbox style */}
          {themeName && (
            <div className="px-1 mb-2">
              <label className="flex items-center gap-3 cursor-pointer group py-2">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={markAsTheme}
                    onChange={(e) => setMarkAsTheme(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                      markAsTheme
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-purple-400/50 group-hover:border-purple-400'
                    }`}
                  >
                    {markAsTheme && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {t('modal.markAsTheme')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {themeName}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {themeCompleted
                      ? t('modal.themeAlreadyMarked')
                      : t('modal.themeReward')}
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Payment Options Section */}
          <div className="space-y-3">
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">
                {t('modal.chooseSubmission')}
              </h4>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            {/* Option 1: Instant Proof with POL */}
            <ProofOptionCard
              variant="instant-pol"
              cost={nativeCost}
              costSubtext={nativeCostUsd}
              balance={polBalance}
              disabled={isSubmitting}
              onClick={() =>
                onSelectInstant({
                  message,
                  username,
                  title,
                  description,
                  paymentMethod: 'NATIVE',
                  markAsTheme,
                })
              }
            />

            {/* Option 2: Instant Proof with TIME26 */}
            <ProofOptionCard
              variant="instant-time26"
              cost={time26CardState === 'gasless' ? gaslessTotalCost + ' TIME' : time26Cost}
              time26State={time26CardState as 'gasless' | 'available' | 'insufficient'}
              balance={time26Balance}
              disabled={isSubmitting}
              isLoading={gaslessLoading}
              onClick={() =>
                onSelectInstant({
                  message,
                  username,
                  title,
                  description,
                  paymentMethod: time26CardState === 'gasless' ? 'TIME26_GASLESS' : 'TIME26',
                  markAsTheme,
                })
              }
            />

            {/* Option 3: Standard Proof (Free) */}
            <ProofOptionCard
              variant="standard"
              cost="FREE"
              disabled={isSubmitting}
              onClick={() =>
                onSelectStandard({ message, username, title, description, markAsTheme })
              }
            />
          </div>

          {/* Info: Technology Explanation - plain text, not a card */}
          <div className="mt-4 px-1">
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              <span className="text-zinc-500 font-medium">{t('modal.techTitle')}</span>
              {' — '}
              {t('modal.techDesc1')} {t('modal.techDesc2')}
            </p>
          </div>

          <div className="text-center pt-4">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-zinc-500 hover:text-white text-sm transition-colors py-2 px-4 rounded-lg hover:bg-white/5"
            >
              {t('modal.cancel')}
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl">
            <div className="w-10 h-10 border-2 border-[#0CC9F2] border-t-transparent rounded-full animate-spin mb-4" />
            <div className="flex flex-col items-center gap-1 px-4">
              {messageHistory.map((item, index) => {
                const isNewest = index === messageHistory.length - 1;
                const opacity = isNewest
                  ? 1
                  : index === messageHistory.length - 2
                    ? 0.5
                    : 0.2;
                return (
                  <p
                    key={item.id}
                    className={`font-mono text-sm text-center transition-all duration-500 ${isNewest ? 'animate-in slide-in-from-bottom-4 fade-in' : ''}`}
                    style={{
                      opacity,
                      color: `rgba(255, 255, 255, ${opacity})`,
                      transform: isNewest
                        ? 'translateY(0)'
                        : 'translateY(-4px)',
                    }}
                  >
                    {item.text}
                  </p>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
