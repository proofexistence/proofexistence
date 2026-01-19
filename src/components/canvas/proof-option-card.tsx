// src/components/canvas/proof-option-card.tsx
'use client';

import { useTranslations } from 'next-intl';

export type ProofOptionVariant = 'instant-pol' | 'instant-time26' | 'standard';
export type Time26CardState = 'gasless' | 'available' | 'insufficient';

export interface ProofOptionCardProps {
  variant: ProofOptionVariant;
  cost: string;
  costSubtext?: string;
  time26State?: Time26CardState;
  balance?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export function ProofOptionCard({
  variant,
  cost,
  costSubtext,
  time26State,
  balance,
  disabled = false,
  isLoading = false,
  onClick,
}: ProofOptionCardProps) {
  const t = useTranslations('canvas');

  if (variant === 'instant-pol') {
    return (
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className="w-full group relative flex flex-col p-5 rounded-3xl border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg bg-gradient-to-br from-[#0CC9F2]/10 to-[#7E44DB]/10 hover:from-[#0CC9F2]/20 hover:to-[#7E44DB]/20 border-[#4877DA]/20 hover:border-[#4877DA]/40 shadow-blue-900/20"
      >
        {/* Hover glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0CC9F2]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Header */}
        <div className="flex items-start justify-between w-full relative z-10 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#4877DA]/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <span className="text-cyan-300">⚡</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">
                {t('modal.perpetualProof')}
              </h3>
              <p className="text-cyan-400/80 text-xs font-medium">with POL</p>
            </div>
          </div>
          {/* "Supports creators" badge */}
          <span className="text-[10px] font-medium bg-cyan-500/20 text-cyan-200 px-2 py-1 rounded-full border border-cyan-500/30">
            {t('modal.supportsCreators')}
          </span>
        </div>

        {/* Description */}
        <p className="text-zinc-400 text-sm mb-3 relative z-10">
          {t('modal.perpetualDescNative')}
        </p>

        {/* Price block */}
        <div className="mt-auto p-3 rounded-xl bg-black/20 border border-white/5 relative z-10">
          <div className="text-lg font-mono font-bold text-white">{cost}</div>
          {costSubtext && (
            <div className="text-xs text-zinc-400 mt-0.5">{costSubtext}</div>
          )}
        </div>
      </button>
    );
  }

  if (variant === 'instant-time26') {
    const isGasless = time26State === 'gasless';
    const isInsufficient = time26State === 'insufficient';

    // Color schemes based on state
    const colors = isGasless
      ? {
          bg: 'from-green-500/10 to-emerald-500/10',
          bgHover: 'hover:from-green-500/20 hover:to-emerald-500/20',
          border: 'border-green-500/30 hover:border-green-500/50',
          shadow: 'shadow-green-900/20',
          icon: 'bg-green-500/20 text-green-300',
          accent: 'text-green-400',
          glow: 'from-green-500/10',
        }
      : isInsufficient
        ? {
            bg: 'from-zinc-500/5 to-zinc-500/5',
            bgHover: '',
            border: 'border-zinc-500/20',
            shadow: 'shadow-zinc-900/10',
            icon: 'bg-zinc-700 text-zinc-500',
            accent: 'text-zinc-500',
            glow: 'from-zinc-500/5',
          }
        : {
            bg: 'from-[#7E44DB]/10 to-[#F472B6]/10',
            bgHover: 'hover:from-[#7E44DB]/20 hover:to-[#F472B6]/20',
            border: 'border-[#7E44DB]/30 hover:border-[#7E44DB]/50',
            shadow: 'shadow-purple-900/20',
            icon: 'bg-[#7E44DB]/20 text-pink-300',
            accent: 'text-purple-400',
            glow: 'from-[#F472B6]/10',
          };

    return (
      <button
        onClick={onClick}
        disabled={disabled || isLoading || isInsufficient}
        className={`w-full group relative flex flex-col p-5 rounded-3xl border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg bg-gradient-to-br ${colors.bg} ${colors.bgHover} ${colors.border} ${colors.shadow}`}
      >
        {/* Hover glow effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${colors.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
        />

        {/* Header */}
        <div className="flex items-start justify-between w-full relative z-10 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.1)] ${colors.icon}`}
            >
              <span>{isGasless ? '✨' : '💎'}</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">
                {t('modal.perpetualProof')}
              </h3>
              <p className={`text-xs font-medium ${colors.accent}`}>
                with TIME26
              </p>
            </div>
          </div>
          {/* Gasless badge */}
          {isGasless && (
            <span className="text-[10px] font-bold bg-green-500/20 text-green-200 px-2 py-1 rounded-full border border-green-500/30 animate-pulse">
              GAS FREE
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-zinc-400 text-sm mb-3 relative z-10">
          {isGasless
            ? t('modal.perpetualDescGasless')
            : t('modal.perpetualDescTime26')}
        </p>

        {/* Price block */}
        <div className="mt-auto p-3 rounded-xl bg-black/20 border border-white/5 relative z-10">
          {isInsufficient ? (
            <>
              <div className="text-lg font-mono font-bold text-zinc-500">
                {cost}
              </div>
              <div className="text-xs text-red-400 mt-0.5">
                {t('modal.insufficientBalance')}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-mono font-bold text-white">
                {cost}
                {isGasless && (
                  <span className="text-xs text-zinc-500 ml-2">
                    {t('modal.inclGas')}
                  </span>
                )}
              </div>
              {balance && (
                <div className="text-xs text-zinc-400 mt-0.5">
                  {t('modal.walletBalance')}: {balance} TIME
                </div>
              )}
              {isGasless && (
                <div className="text-xs text-green-400 mt-1">
                  {t('modal.noSignatureNeeded')}
                </div>
              )}
            </>
          )}
        </div>
      </button>
    );
  }

  // Standard Proof (always last - free daily batch)
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full group relative flex flex-col p-5 rounded-3xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Header */}
      <div className="flex items-start justify-between w-full mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg grayscale group-hover:grayscale-0 transition-all">
            ⏳
          </div>
          <div>
            <h3 className="text-zinc-400 font-medium text-base group-hover:text-white transition-colors">
              {t('modal.standardProof')}
            </h3>
          </div>
        </div>
        {/* Free badge */}
        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-500 px-2 py-1 rounded-full">
          {t('modal.free')}
        </span>
      </div>

      {/* Description */}
      <p className="text-zinc-500 text-xs">
        <strong>{t('modal.gasFree')}.</strong> {t('modal.standardDesc')}
      </p>
    </button>
  );
}
