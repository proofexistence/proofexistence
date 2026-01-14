'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Link } from '@/i18n/navigation';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import { normalizeArweaveUrl, getArweaveUrl } from '@/lib/arweave-gateway';

interface Session {
  id: string;
  ipfsHash: string | null;
  title?: string | null;
  trailData?: unknown | null;
  color?: string | null;
  previewUrl?: string | null;
}

interface AnimatedHeroProps {
  sessions: Session[];
}

export function AnimatedHero({ sessions = [] }: AnimatedHeroProps) {
  const t = useTranslations('home.hero');
  const tNav = useTranslations('nav');
  const containerRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Split sessions into two orbits
  const innerOrbit = sessions.slice(0, 3);
  const outerOrbit = sessions.slice(3, 8);

  // Use gsap for entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (contentRef.current)
        gsap.set(contentRef.current, { opacity: 0, y: 20 });
      if (titleRef.current)
        gsap.set(titleRef.current, { y: 40, scale: 0.9, opacity: 0 });

      if (contentRef.current)
        tl.to(contentRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.3,
        });
      if (titleRef.current)
        tl.to(
          titleRef.current,
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: 'back.out(1.7)',
          },
          '-=0.5'
        );

      tl.fromTo(
        subtitleRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        '-=0.4'
      );
      tl.fromTo(
        ctaRef.current,
        { y: 20, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6 },
        '-=0.3'
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const title = 'POE 2026';

  return (
    <section
      ref={containerRef}
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* Background Orbits Container with Mask for Edge Blending */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none [mask-image:radial-gradient(circle,black_30%,transparent_70%)]">
        {/* Inner Orbit System */}
        <div className="absolute w-[50vw] h-[50vw] max-w-[450px] max-h-[450px]">
          {/* Visual Ring */}
          <div className="absolute inset-0 rounded-full border border-white/5 opacity-20" />
          {/* Orbit Items */}
          {innerOrbit.map((session, i) => (
            <OrbitItem
              key={session.id}
              session={session}
              index={i}
              total={innerOrbit.length}
              duration={60}
              direction={1}
            />
          ))}
        </div>

        {/* Outer Orbit System */}
        <div className="absolute w-[80vw] h-[80vw] max-w-[750px] max-h-[750px] md:w-[70vw] md:h-[70vw]">
          {/* Visual Ring */}
          <div className="absolute inset-0 rounded-full border border-white/5 opacity-10" />
          {/* Orbit Items */}
          {outerOrbit.map((session, i) => (
            <OrbitItem
              key={session.id}
              session={session}
              index={i}
              total={outerOrbit.length}
              duration={90}
              direction={-1}
            />
          ))}
        </div>
      </div>

      {/* Center Content */}
      <div
        ref={contentRef}
        className="z-50 text-center items-center flex flex-col px-6 pointer-events-auto"
      >
        {/* Main Title */}
        <div ref={titleRef} className="relative z-10">
          <h1
            className="text-6xl md:text-9xl font-bold tracking-tighter cursor-default font-sans drop-shadow-[0_0_20px_rgba(126,68,219,0.5)]"
            style={{
              background:
                'linear-gradient(to right, #0CC9F2, #4877DA, #7E44DB, #4877DA, #0CC9F2)',
              backgroundSize: '300% 100%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              animation: 'gradient 6s linear infinite',
            }}
          >
            {title}
          </h1>
        </div>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-xl md:text-2xl text-zinc-400 max-w-2xl mb-8 font-light leading-relaxed text-center mt-6 relative z-10"
        >
          {t('subtitle')}
          <span className="block text-zinc-500 text-sm md:text-base mt-2">
            {t('description')}
          </span>
        </p>

        {/* CTA Buttons */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link
            href="/cosmos"
            className="group px-8 py-3.5 bg-cyan-500/10 hover:bg-cyan-500/20 backdrop-blur-2xl text-white rounded-full font-bold border border-white/20 hover:border-white/40 shadow-[0_8px_32px_rgba(12,201,242,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_8px_32px_rgba(12,201,242,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 relative z-10 overflow-hidden justify-center"
          >
            <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <span className="relative z-10">{t('exploreCosmos')}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative z-10 group-hover:rotate-180 transition-transform duration-500"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>

          <Link
            href="/canvas"
            className="group px-8 py-3.5 bg-purple-500/10 hover:bg-purple-500/20 backdrop-blur-2xl text-white rounded-full font-bold border border-white/20 hover:border-white/40 shadow-[0_8px_32px_rgba(126,68,219,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_8px_32px_rgba(126,68,219,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 relative z-10 overflow-hidden justify-center"
          >
            <span className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <Pencil className="relative z-10 w-4 h-4" />
            <span className="relative z-10">{tNav('drawToProof')}</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-12 opacity-50 animate-bounce z-50 pointer-events-none">
        <svg
          className="w-6 h-6 text-zinc-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}

// Inner Component for Orbit Item
function OrbitItem({
  session,
  index,
  total,
  duration,
  direction,
}: {
  session: Session;
  index: number;
  total: number;
  duration: number;
  direction: number;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Skip if we already have an image or previewUrl is set
    if (session.previewUrl) {
      // Use a microtask to avoid synchronous setState warning
      const url = session.previewUrl;
      queueMicrotask(() => setImageUrl(url));
      return;
    }
    if (session.ipfsHash) {
      const ipfsHash = session.ipfsHash; // Capture for closure
      let cancelled = false;
      const fetchIpfs = async () => {
        try {
          const res = await fetch(getArweaveUrl(ipfsHash));
          if (res.ok && !cancelled) {
            const data = await res.json();
            if (data.image) setImageUrl(normalizeArweaveUrl(data.image));
          }
        } catch {
          // Ignore fetch errors
        }
      };
      fetchIpfs();
      return () => {
        cancelled = true;
      };
    }
  }, [session]);

  const angleStep = 360 / total;
  const initialAngle = index * angleStep;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ rotate: initialAngle }}
      animate={{ rotate: initialAngle + 360 * direction }}
      transition={{ duration: duration, repeat: Infinity, ease: 'linear' }}
    >
      {/* The Item: Placed at top center of the rotating ring */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
        animate={{ rotate: -(initialAngle + 360 * direction) }} // Counter-rotate to keep upright
        transition={{ duration: duration, repeat: Infinity, ease: 'linear' }}
      >
        <Link
          href={`/proof/${session.id}`}
          className="group relative block transition-transform hover:scale-125 duration-300"
        >
          {/* Fallback Star / Glow */}
          <div
            className={`absolute inset-0 bg-white rounded-full blur-md transition-opacity duration-500 ${isLoaded ? 'opacity-40 group-hover:opacity-60' : 'opacity-80 w-2 h-2 mx-auto mt-8'}`}
          />

          {/* Actual Image Card */}
          {imageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={session.title || ''}
                className={`w-14 h-14 md:w-20 md:h-20 object-cover rounded-full border-2 border-white/20 shadow-[0_0_15px_rgba(126,68,219,0.5)] transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                onLoad={() => setIsLoaded(true)}
              />
              {/* Hover Tooltip/Title */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs text-zinc-400 bg-black/80 px-2 py-1 rounded pointer-events-none">
                {session.title || 'Proof'}
              </div>
            </>
          )}

          {/* If not loaded yet, show just the star dot */}
          {!isLoaded && (
            <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white] animate-pulse" />
          )}
        </Link>
      </motion.div>
    </motion.div>
  );
}
