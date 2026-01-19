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
        className="group relative flex flex-col p-5 rounded-3xl border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg bg-gradient-to-br from-[#0CC9F2]/10 to-[#7E44DB]/10 hover:from-[#0CC9F2]/20 hover:to-[#7E44DB]/20 border-[#4877DA]/20 hover:border-[#4877DA]/40 shadow-blue-900/20"
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

  // Placeholder for other variants
  return <div>Other variant placeholder</div>;
}
