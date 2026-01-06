'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslations } from 'next-intl';
import { HomeActions } from './home-actions';

// Register ScrollTrigger
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function AnimatedCTA() {
  const t = useTranslations('home.cta');
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Title animation
      gsap.fromTo(
        titleRef.current,
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: 'back.out(1.4)',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Actions animation
      gsap.fromTo(
        actionsRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          delay: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 70%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Pulsing glow effect
      gsap.to('.cta-glow', {
        scale: 1.2,
        opacity: 0.6,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-8 relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="cta-glow absolute w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

      <h2
        ref={titleRef}
        className="text-3xl md:text-5xl font-bold text-white tracking-tight relative z-10"
      >
        {t('leaveTrace')}
      </h2>

      <div ref={actionsRef} className="relative z-10">
        <HomeActions />
      </div>
    </section>
  );
}
