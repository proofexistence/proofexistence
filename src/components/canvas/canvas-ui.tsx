'use client';

import { TRAIL_COLORS } from './light-trail';
import { MIN_SESSION_DURATION } from '@/types/session';
import { Highlighter } from '../ui/highlighter';
import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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
}

export function TimerDisplay({
  duration,
  isRecording,
  isValid,
}: TimerDisplayProps) {
  const getIndicatorClass = () => {
    if (!isRecording) return 'bg-gray-500';
    if (isValid)
      return 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50';
    return 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50';
  };

  return (
    <div className="absolute top-12 md:top-14 left-1/2 -translate-x-1/2 pointer-events-none">
      <div className="bg-black/20 backdrop-blur-xl rounded-full px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-2 md:gap-3 border border-white/10 shadow-lg shadow-black/20 transition-all duration-300">
        <div
          className={`w-3 h-3 rounded-full border border-white/30 transition-colors duration-300 ${getIndicatorClass()}`}
        />
        <span className="text-white font-mono text-sm md:text-base tracking-wider min-w-[3ch] text-center">
          {formatTime(duration)}
        </span>
        {!isValid && isRecording && (
          <span className="text-yellow-300/80 text-xs md:text-sm font-light border-l border-white/20 pl-3">
            Min: {MIN_SESSION_DURATION}s
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
    <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-1 md:p-2 border border-white/10 shadow-lg shadow-black/20 pointer-events-auto transition-all duration-300">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-6 h-6 md:w-6 md:h-6 rounded-full border-2 border-white scale-110 shadow-lg ring-2 ring-white/20 transition-all duration-200 hover:scale-125"
          style={{ backgroundColor: trailColor }}
          aria-label="Expand Color Picker"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:flex animate-in fade-in zoom-in-95 duration-200">
          {TRAIL_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                onColorChange(c.value);
                setIsExpanded(false);
              }}
              className={`w-6 h-6 md:w-6 md:h-6 rounded-full border-2 transition-all duration-200 hover:scale-110 active:scale-95 ${
                trailColor === c.value
                  ? 'border-white scale-110 shadow-lg ring-2 ring-white/20'
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
  return (
    <div className="flex gap-3 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
      <button
        onClick={onClear}
        className="h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-xl text-white font-medium px-4 rounded-xl transition-all border border-white/10 hover:border-white/20 active:scale-95"
      >
        Clear & Start
      </button>
      <button
        onClick={onSubmit}
        className="h-10 flex items-center justify-center bg-[linear-gradient(to_bottom_right,#0CC9F2,#4877DA,#7E44DB)] hover:brightness-110 backdrop-blur-xl text-white font-medium px-6 rounded-xl transition-all border border-purple-400/30 hover:border-purple-400/50 shadow-lg shadow-purple-500/20 active:scale-95"
      >
        Submit Proof
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
  return (
    <div className="absolute top-12 left-4 md:top-14 md:left-6 pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
      <button
        onClick={onExit}
        className="flex items-center gap-2 bg-black/20 hover:bg-black/40 backdrop-blur-xl text-white/80 hover:text-white font-medium px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base rounded-xl transition-all border border-white/10 hover:border-white/20 active:scale-95 shadow-lg shadow-black/20 group"
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
        Exit
      </button>
    </div>
  );
}

// -- Component: Instructions / Status --
interface InstructionsProps {
  isRecording: boolean;
  isReady: boolean;
  onClear?: () => void;
  onSubmit?: () => void;
}

export function Instructions({
  isRecording,
  isReady,
  onClear,
  onSubmit,
}: InstructionsProps) {
  const positionClass = isRecording
    ? 'absolute top-24 md:top-32 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-4 w-full px-4'
    : 'absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-4 w-full px-4';

  return (
    <div className={positionClass}>
      {!isReady && !isRecording && (
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl px-8 py-5 border border-white/10 shadow-lg shadow-black/20 text-center animate-in fade-in zoom-in-95 duration-500">
          <p className="text-white text-lg font-light mb-2 flex items-center gap-2 justify-center">
            <Highlighter action="underline" color="#D8B4FE">
              Click and hold
            </Highlighter>{' '}
            to draw
          </p>
          <p className="text-white/60 text-sm">
            Create a light trail for{' '}
            <Highlighter action="highlight" color="#A855F7">
              at least 10s
            </Highlighter>{' '}
            to generate a proof
          </p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs font-mono">
              (Ctrl + B to cycle themes)
            </p>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-black/20 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/10 shadow-lg shadow-black/20">
            <p className="text-white/80 text-sm font-light flex items-center gap-2">
              <span>🖱️</span> Release to stop • Move cursor to draw
            </p>
          </div>
        </div>
      )}

      {isReady && !isRecording && (
        <div className="bg-black/20 backdrop-blur-xl rounded-2xl px-8 py-5 border border-white/10 shadow-lg shadow-black/20 text-center animate-in fade-in zoom-in-95 duration-500">
          <p className="text-transparent bg-clip-text bg-[linear-gradient(to_right,#0CC9F2,#4877DA,#7E44DB)] text-lg font-bold mb-2 flex items-center gap-2 justify-center">
            <svg
              className="w-5 h-5 text-[#0CC9F2]"
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
            Proof recorded!
          </p>
          <div className="hidden md:block">
            <p className="text-white/60 text-sm">
              Use buttons above to Submit or Clear & Start new
            </p>
          </div>
          <div className="block md:hidden mt-4">
            {onClear && onSubmit && (
              <ActionButtons onClear={onClear} onSubmit={onSubmit} />
            )}
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
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-50 animate-in fade-in duration-200">
      <div
        className="bg-black/60 backdrop-blur-sm absolute inset-0"
        onClick={onCancel}
      />
      <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl shadow-black/40 z-10 max-w-sm mx-4 transform transition-all scale-100">
        <h3 className="text-white text-lg font-medium mb-3">
          Start New Drawing?
        </h3>
        <p className="text-white/70 text-sm mb-5">
          This will clear your current trail. Would you like to continue?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-black/40 hover:bg-black/60 text-white font-medium px-4 py-2.5 rounded-lg transition-all border border-white/10 hover:border-white/20"
          >
            Keep Trail
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-[linear-gradient(to_bottom_right,#0CC9F2,#4877DA,#7E44DB)] hover:brightness-110 text-white font-medium px-4 py-2.5 rounded-lg transition-all shadow-lg hover:shadow-purple-500/25"
          >
            Clear & Start
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Component: Submission Modal (Standard vs Instant) --
interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStandard: (data: {
    message: string;
    username: string;
    title: string;
    description: string;
  }) => void;
  onSelectInstant: (data: {
    message: string;
    username: string;
    title: string;
    description: string;
    paymentMethod?: 'NATIVE' | 'TIME26';
  }) => void;
  isSubmitting: boolean;
  profileName?: string;
  profileUsername?: string;
  time26Balance?: string;
  nativeCost?: string;
  nativeCostUsd?: string;
  time26Cost?: string;
  loadingMessage?: string;
  onSetAsDisplayName?: (name: string) => Promise<void>;
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
  nativeCost = '... POL',
  nativeCostUsd = '',
  time26Cost = '... TIME',
  loadingMessage,
  onSetAsDisplayName,
}: SubmissionModalProps) {
  // Logic: Default to Name -> Username -> Empty (Anonymous)
  const defaultName = profileName || profileUsername || '';
  const [username, setUsername] = useState(defaultName);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState(''); // Moved up to group state
  const [paymentMethod, setPaymentMethod] = useState<'NATIVE' | 'TIME26'>(
    'NATIVE'
  );
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);

  // Sync username with profile name when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername(profileName || profileUsername || '');
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

  // Dropdown state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNameSelect = (name: string) => {
    setUsername(name);
    setIsDropdownOpen(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasProfileInfo = !!(profileName || profileUsername);

  // Helper to sync close with onOpenChange
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

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
              Save Your Legacy
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-center text-sm">
              Choose how you want to immortalize this moment.
            </DialogDescription>
          </DialogHeader>

          {/* Wrapper for Vertical Layout */}
          <div className="space-y-4 mb-4">
            {/* --- ART DETAILS SECTION (First) --- */}
            <div className="space-y-3 p-4 bg-zinc-900/40 rounded-3xl border border-white/5">
              <h4 className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 tracking-widest uppercase mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                Artwork Details
              </h4>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 ml-1">
                  ARTWORK TITLE (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Name your creation..."
                  maxLength={100}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-sm font-bold"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 ml-1">
                  DESCRIPTION (OPTIONAL)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your artistic vision..."
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
                On-Chain Identity
              </h4>

              {/* 1. Name on Chain */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 ml-1">
                  NAME YOU WANT TO LEAVE ON THE CHAIN (OPTIONAL)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={profileName || 'Anonymous'}
                    maxLength={50}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono text-sm"
                  />
                  <div className="absolute right-3 top-2.5 flex items-center gap-2">
                    {profileName && username !== profileName && (
                      <button
                        onClick={() => setUsername(profileName)}
                        className="text-[10px] text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2 py-1 rounded"
                      >
                        Reset
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
                            ? 'Saving...'
                            : displayNameSaved
                              ? 'Saved!'
                              : 'Set as display name'}
                        </button>
                      )}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1 ml-1">
                  Leave empty to appear as &ldquo;Anonymous&rdquo;
                </p>
              </div>

              {/* 2. Message */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1.5 ml-1">
                  MESSAGE TO THE WORLD (OPTIONAL)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What do you want to leave behind?"
                  maxLength={280}
                  rows={2}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none italic text-sm"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector (Full Width) */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-500 mb-2 ml-1">
              PAYMENT METHOD
            </label>
            <div className="flex gap-2 p-1.5 bg-zinc-900/60 rounded-2xl border border-white/5">
              <button
                onClick={() => setPaymentMethod('NATIVE')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${paymentMethod === 'NATIVE' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                POL
              </button>
              <button
                onClick={() => setPaymentMethod('TIME26')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${paymentMethod === 'TIME26' ? 'bg-[#7E44DB]/20 text-purple-200 border border-[#7E44DB]/30 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Time26 Token
              </button>
            </div>
            {paymentMethod === 'TIME26' && (
              <div className="flex justify-between items-center px-3 mt-2">
                <span className="text-xs text-zinc-500">
                  Balance:{' '}
                  <span className="text-purple-300 font-mono">
                    {time26Balance} TIME
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* Option 1: Instant Proof (Primary) */}
            <button
              onClick={() =>
                onSelectInstant({
                  message,
                  username,
                  title,
                  description,
                  paymentMethod,
                })
              }
              disabled={isSubmitting}
              className={`group relative flex items-center gap-4 p-5 rounded-3xl border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg ${
                paymentMethod === 'TIME26'
                  ? 'bg-gradient-to-br from-[#7E44DB]/10 to-[#F472B6]/10 hover:from-[#7E44DB]/20 hover:to-[#F472B6]/20 border-[#7E44DB]/30 hover:border-[#7E44DB]/50 shadow-purple-900/20'
                  : 'bg-gradient-to-br from-[#0CC9F2]/10 to-[#7E44DB]/10 hover:from-[#0CC9F2]/20 hover:to-[#7E44DB]/20 border-[#4877DA]/20 hover:border-[#4877DA]/40 shadow-blue-900/20'
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${paymentMethod === 'TIME26' ? 'from-[#F472B6]/10' : 'from-[#0CC9F2]/10'}`}
              />
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.1)] ${paymentMethod === 'TIME26' ? 'bg-[#7E44DB]/20 text-pink-300' : 'bg-[#4877DA]/20 text-cyan-300'}`}
              >
                {paymentMethod === 'TIME26' ? '💎' : '⚡'}
              </div>
              <div className="flex-1 relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-bold text-lg">
                    Perpetual Proof (Instant)
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-full border ${paymentMethod === 'TIME26' ? 'bg-pink-500/20 text-pink-200 border-pink-500/30' : 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30'}`}
                    >
                      {paymentMethod === 'TIME26' ? time26Cost : nativeCost}
                    </span>
                    {paymentMethod === 'NATIVE' && nativeCostUsd && (
                      <span className="text-[10px] text-cyan-200/50 font-mono">
                        {nativeCostUsd}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-purple-200/70 text-sm leading-snug">
                  {paymentMethod === 'TIME26'
                    ? 'Write your trail to Arweave instantly, verified on Polygon. Mint your personal Trail NFT + badge & Burn Time26.'
                    : 'Write your trail to Arweave instantly, verified on Polygon. Mint your personal Trail NFT + badge.'}
                </p>
              </div>
            </button>

            {/* Option 2: Standard Proof (Secondary) */}
            <button
              onClick={() =>
                onSelectStandard({ message, username, title, description })
              }
              disabled={isSubmitting}
              className="group relative flex items-center gap-4 p-5 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg grayscale group-hover:grayscale-0 transition-all">
                ⏳
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="text-zinc-400 font-medium text-base group-hover:text-white transition-colors">
                    Standard Proof (Daily Batch)
                  </h3>
                  <span className="text-[10px] font-mono bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                    FREE
                  </span>
                </div>
                <p className="text-zinc-500 text-xs">
                  <strong>Free (0 gas). </strong> Included in the daily on-chain
                  batch (UTC 00:00). Full data uploaded by the protocol to
                  Polygon.
                </p>
              </div>
            </button>
          </div>

          {/* Info Box: Technology Explanation */}
          <div className="mt-4 p-4 bg-zinc-900/40 rounded-2xl border border-white/5">
            <h4 className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 tracking-widest uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
              Why this is safe? / How it works
            </h4>
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 leading-relaxed">
                Your creative data is secured using cryptographic{' '}
                <span className="text-zinc-300 font-medium">hashing</span>{' '}
                (SHA-256). These unique fingerprints are aggregated into a{' '}
                <span className="text-zinc-300 font-medium">Merkle Tree</span>{' '}
                structure.
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Finally, we{' '}
                <span className="text-zinc-300 font-medium">batch</span> these
                proofs into a single verifiable transaction on the blockchain.
                This ensures your work is mathematically proven to exist at this
                specific time, with the security of the entire network.
              </p>
            </div>
          </div>

          <div className="text-center pt-4">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-zinc-500 hover:text-white text-sm transition-colors py-2 px-4 rounded-lg hover:bg-white/5"
            >
              Cancel
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
