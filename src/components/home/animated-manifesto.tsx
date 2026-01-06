'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslations } from 'next-intl';

// Register ScrollTrigger
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="highlight-word text-white font-medium drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
    {children}
  </span>
);

interface ManifestoSectionProps {
  children: React.ReactNode;
  className?: string;
}

function ManifestoSection({ children, className = '' }: ManifestoSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Main content animation
      gsap.fromTo(
        sectionRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            end: 'top 40%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Highlight words glow effect on scroll
      const highlights =
        sectionRef.current?.querySelectorAll('.highlight-word');
      if (highlights) {
        gsap.fromTo(
          highlights,
          { textShadow: '0 0 0 rgba(255,255,255,0)' },
          {
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
            duration: 0.8,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 60%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto ${className}`}
    >
      {children}
    </div>
  );
}

export function AnimatedManifesto() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('home.manifesto');

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Animate the connecting line
      if (lineRef.current) {
        gsap.fromTo(
          lineRef.current,
          { scaleY: 0, opacity: 0 },
          {
            scaleY: 1,
            opacity: 1,
            duration: 1.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: lineRef.current,
              start: 'top 70%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col w-full relative z-10">
      {/* 1. The History */}
      <ManifestoSection>
        <h2 className="text-3xl md:text-5xl font-thin leading-tight text-zinc-300">
          {t.rich('historyTitle', {
            few: (chunks) => <Highlight>{chunks}</Highlight>,
          })}
        </h2>
        <p className="mt-8 text-lg md:text-xl text-zinc-500 font-light max-w-2xl">
          {t('historySubtitle')}
        </p>
      </ManifestoSection>

      {/* 2. The Ghost */}
      <ManifestoSection>
        <h2 className="text-3xl md:text-5xl font-thin leading-tight text-zinc-300">
          {t.rich('ghostTitle', {
            you: (chunks) => <Highlight>{chunks}</Highlight>,
          })}
        </h2>
        <p className="mt-8 text-lg md:text-xl text-zinc-500 font-light max-w-2xl">
          {t('ghostSubtitle')}
        </p>
      </ManifestoSection>

      {/* 3. The Solution / Epic */}
      <ManifestoSection className="min-h-[80vh]">
        <h2 className="text-4xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white via-zinc-200 to-zinc-600 pb-2">
          {t('solutionTitle')}
        </h2>
        <p className="mt-8 text-xl md:text-2xl text-zinc-400 font-light max-w-3xl leading-relaxed">
          {t('solutionSubtitle')}
        </p>
        <div
          ref={lineRef}
          className="w-px h-24 bg-gradient-to-b from-purple-500/0 via-purple-500/50 to-purple-500/0 mt-12 origin-top"
        />
      </ManifestoSection>
    </div>
  );
}
