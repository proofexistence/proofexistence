'use client';

import { Link } from 'lucide-react';
import { CosmosTrail } from './types';
import NextLink from 'next/link';
import { useEffect, useState } from 'react';

interface TechInfoOverlayProps {
  trail: CosmosTrail | null;
  screenPos: { x: number; y: number } | null;
  onClose: () => void;
}

export function TechInfoOverlay({
  trail,
  screenPos,
  onClose,
}: TechInfoOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (trail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 300); // Wait for exit anim
      return () => clearTimeout(t);
    }
  }, [trail]);

  if (!trail && !mounted) return null;

  // If trail exists, use it. If not, we might be unmounting, so keep showing the old one for a sec?
  // Actually simpler to just rely on "trail" prop for content and animate out if null.
  // Ideally parent keeps the "last selected" trail in state if animating out, but let's just fade out for now.

  const content = trail;
  if (!content) return null; // Logic gap: if !trail but mounted, we need content.
  // We'll skip complex exit animations for simplicity in v1.

  // Screen Position Logic
  // screenPos is {x, y} in pixels. (e.g. 500, 300)
  // We want to draw a line from there to the Info Card.
  // Let's place the card in the Bottom Left or Bottom Right depending on where x is.

  // Actually, request was "A line comes out to the open space".
  // Let's fix the card at Bottom Left for consistency, and draw a dynamic SVG line.

  if (!screenPos) return null;

  // Determine if mobile for layout
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const cardWidth = isMobile ? 280 : 320;
  const cardX = isMobile ? 20 : 40; // Shift left on mobile
  // const cardY = window.innerHeight - 200; // Unused

  // Control points for the line
  const startX = screenPos.x;
  const startY = screenPos.y;

  // Elbow connector
  // const midX = startX; // Unused
  // const midY = cardY; // Unused

  // Determine target connection point on card
  // On Mobile: Card is centered, so target is Bottom-Center of screen relative to card? No, target is top-middle of card.
  // Card centered at bottom: left=50%, bottom=24px.
  // Card Width=280. Center of card X = window.innerWidth / 2.
  // Top of card Y = window.innerHeight - 24 - (height approx 200.. actually height is variable).
  // Let's rely on fixed approximations or just target the center-top area.

  // Mobile Target X: Center of screen
  // Mobile Target Y: Bottom area (e.g. window.innerHeight - 250)

  const targetCardX = isMobile
    ? typeof window !== 'undefined'
      ? window.innerWidth / 2
      : 0
    : cardX + cardWidth;
  const targetCardY = isMobile
    ? typeof window !== 'undefined'
      ? window.innerHeight - 220
      : 0
    : typeof window !== 'undefined'
      ? window.innerHeight - 200
      : 0;

  // Elbow logic adjustment for mobile
  // If mobile, line goes from Star -> [StarX, MidY] -> [CenterX, MidY] -> [CenterX, CardTop]
  // Or simpler: just ensure it connects cleanly.

  const elbowX = isMobile ? targetCardX : cardX + cardWidth + 40;
  // For mobile, maybe just go straight or use a simpler path?
  // Let's keep logic simple: From Star.. out to side? Or direct?
  // User didn't specify, let's just make sure it points to the new card position.

  // Existing logic uses lineStartX.
  // New simple path for mobile:
  // M startX startY L targetCardX targetCardY? (Direct line might clip text)
  // Let's stick to the dogleg but adapt coordinates.
  const direction = elbowX > startX ? 1 : -1;
  const lineStartX = startX + direction * (isMobile ? 20 : 80);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {/* SVG Connection Line */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0CC9F2" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0CC9F2" stopOpacity="1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* The Connection Line to the Card */}
        <path
          d={
            isMobile
              ? `M ${startX} ${startY} 
                 L ${startX} ${targetCardY - 40} 
                 L ${targetCardX} ${targetCardY - 40}
                 L ${targetCardX} ${targetCardY}`
              : `M ${lineStartX} ${startY} 
                 L ${elbowX} ${startY} 
                 L ${elbowX} ${targetCardY}
                 L ${targetCardX} ${targetCardY}`
          }
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          filter="url(#glow)"
          className="animate-pulse opacity-50"
        />

        {/* Connection Point at Card Edge */}
        <circle cx={targetCardX} cy={targetCardY} r="2" fill="#0CC9F2" />

        {/* Brackets around the target */}
        <g transform={`translate(${startX}, ${startY})`}>
          <path
            d="M -20 -20 L -10 -20 L -20 -20 L -20 -10"
            fill="none"
            stroke="#0CC9F2"
            strokeWidth="2"
          />
          <path
            d="M 20 -20 L 10 -20 L 20 -20 L 20 -10"
            fill="none"
            stroke="#0CC9F2"
            strokeWidth="2"
          />
          <path
            d="M -20 20 L -10 20 L -20 20 L -20 10"
            fill="none"
            stroke="#0CC9F2"
            strokeWidth="2"
          />
          <path
            d="M 20 20 L 10 20 L 20 20 L 20 10"
            fill="none"
            stroke="#0CC9F2"
            strokeWidth="2"
          />
        </g>
      </svg>

      {/* Info Card */}
      <div className="absolute transition-all duration-500 ease-out left-1/2 -translate-x-1/2 bottom-12 md:left-[40px] md:bottom-[100px] md:translate-x-0">
        <div className="relative bg-black/80 backdrop-blur-2xl border border-white/10 rounded-sm p-6 w-[280px] md:w-[320px] shadow-[0_0_50px_rgba(72,119,218,0.2)] pointer-events-auto">
          {/* Decoration Lines */}
          <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t border-l border-cyan-400" />
          <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b border-r border-purple-500" />

          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white leading-none tracking-tight">
                {content.title || 'Untitled Time'}
              </h2>
              <div className="text-xs text-cyan-400 font-mono mt-1 tracking-widest uppercase flex items-center gap-2">
                <span className="text-white/60">By</span>
                <span>{content.userName || 'Anonymous Soul'}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/20 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/5 p-2 rounded-sm border border-white/5">
                <div className="text-[9px] text-white/40 uppercase tracking-wider">
                  Origin Date
                </div>
                <div className="text-xs text-white font-mono">
                  {new Date(content.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              <div className="bg-white/5 p-2 rounded-sm border border-white/5">
                <div className="text-[9px] text-white/40 uppercase tracking-wider">
                  Duration
                </div>
                <div className="text-xs text-white font-mono">
                  {Math.round(content.duration)}s Scan
                </div>
              </div>
            </div>

            {/* Message / Thought */}
            {content.message && (
              <div className="text-white/90 text-sm font-medium leading-relaxed">
                &quot;{content.message}&quot;
              </div>
            )}

            {/* Description (Extra Context) */}
            {content.description && content.description !== content.message && (
              <div className="text-white/50 text-xs italic border-l-2 border-purple-500/30 pl-3">
                {content.description}
              </div>
            )}

            <NextLink
              href={`/proof/${content.id}`}
              className="flex items-center justify-between group bg-white/5 hover:bg-white/10 p-3 mt-2 border border-white/5 transition-all"
            >
              <span className="text-xs font-bold text-white/80 group-hover:text-white tracking-widest uppercase">
                Access Proof Data
              </span>
              <Link className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
            </NextLink>
          </div>

          {/* Tech Greeble */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse" />
            <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse delay-75" />
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse delay-150" />
          </div>
        </div>
      </div>
    </div>
  );
}
