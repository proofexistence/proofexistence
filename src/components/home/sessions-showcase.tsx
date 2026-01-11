'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { Heart, Eye } from 'lucide-react';
import { normalizeArweaveUrl, getArweaveUrl } from '@/lib/arweave-gateway';

// Register ScrollTrigger
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface Session {
  id: string;
  createdAt: string;
  status: string;
  ipfsHash: string | null;
  title?: string | null;
  message?: string | null;
  views?: number;
  likes?: number;
  userName?: string | null;
  walletAddress?: string | null;
}

function SessionCard({ session, index }: { session: Session; index: number }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Fetch image from IPFS metadata
  useEffect(() => {
    if (!session.ipfsHash) return;
    const ipfsHash = session.ipfsHash; // Capture for closure

    const fetchImage = async () => {
      try {
        const res = await fetch(getArweaveUrl(ipfsHash));
        if (!res.ok) return;
        const data = await res.json();
        if (data.image) {
          setImageUrl(normalizeArweaveUrl(data.image));
        }
      } catch {
        // Ignore errors
      }
    };

    fetchImage();
  }, [session.ipfsHash]);

  // Floating animation on hover
  useEffect(() => {
    if (!cardRef.current) return;

    const card = cardRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;

      gsap.to(card, {
        rotateX: rotateX,
        rotateY: rotateY,
        transformPerspective: 1000,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const displayName =
    session.userName ||
    (session.walletAddress
      ? `${session.walletAddress.slice(0, 6)}...`
      : 'Anonymous');

  // Different floating patterns for each card
  const floatPatterns = [
    { y: -15, x: 5, duration: 4 },
    { y: 12, x: -8, duration: 5 },
    { y: -20, x: -5, duration: 4.5 },
    { y: 18, x: 10, duration: 5.5 },
    { y: -10, x: -12, duration: 4.2 },
    { y: 15, x: 8, duration: 5.2 },
  ];

  const pattern = floatPatterns[index % floatPatterns.length];

  return (
    <Link
      ref={cardRef}
      href={`/proof/${session.id}`}
      className="showcase-card group relative block w-64 h-80 rounded-2xl overflow-hidden bg-zinc-900/50 border border-white/10 hover:border-purple-500/50 transition-colors shadow-2xl shadow-black/50"
      style={{ transformStyle: 'preserve-3d' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Continuous float animation applied via GSAP in parent */}
      <div
        className="showcase-float absolute inset-0"
        data-pattern={JSON.stringify(pattern)}
      >
        {/* Image Background */}
        <div className="absolute inset-0">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={session.title || 'Proof'}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/30 to-cyan-900/30 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white/20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />

        {/* Hover Glow Effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-2">
            {session.status === 'MINTED' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300">
                NFT
              </span>
            )}
            {session.status === 'SETTLED' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300">
                SETTLED
              </span>
            )}
          </div>

          <p className="text-sm font-medium text-white truncate">
            {session.title || displayName}
          </p>

          {session.message && (
            <p className="text-xs text-zinc-400 truncate italic mt-1">
              &quot;{session.message}&quot;
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {session.views || 0}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {session.likes || 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function SessionsShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch random sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch('/api/sessions/random');
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch {
        console.error('Failed to fetch sessions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // GSAP Scroll Trigger animations
  useEffect(() => {
    if (!sectionRef.current || !containerRef.current || sessions.length === 0)
      return;

    const ctx = gsap.context(() => {
      // Animate cards on scroll
      gsap.fromTo(
        '.showcase-card',
        {
          y: 100,
          opacity: 0,
          scale: 0.8,
          rotateY: -15,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotateY: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            end: 'top 30%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Continuous floating animations for each card
      document.querySelectorAll('.showcase-card').forEach((card, index) => {
        const patterns = [
          { y: -15, x: 5, duration: 4 },
          { y: 12, x: -8, duration: 5 },
          { y: -20, x: -5, duration: 4.5 },
          { y: 18, x: 10, duration: 5.5 },
          { y: -10, x: -12, duration: 4.2 },
          { y: 15, x: 8, duration: 5.2 },
        ];
        const pattern = patterns[index % patterns.length];

        gsap.to(card, {
          y: pattern.y,
          x: pattern.x,
          duration: pattern.duration,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      // Animate title
      gsap.fromTo(
        '.showcase-title',
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [sessions]);

  if (isLoading) {
    return (
      <section className="min-h-[60vh] flex items-center justify-center">
        <div className="flex gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-64 h-80 rounded-2xl bg-zinc-900/50 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (sessions.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className="min-h-[80vh] flex flex-col items-center justify-center py-20 px-6 relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-900/10 blur-[150px] rounded-full" />
      </div>

      {/* Title */}
      <div className="showcase-title text-center mb-16 relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
          Recent Traces
        </h2>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Explore the latest proofs of existence from our community
        </p>
      </div>

      {/* Cards Container */}
      <div
        ref={containerRef}
        className="flex flex-wrap justify-center gap-6 max-w-6xl relative z-10"
        style={{ perspective: '1000px' }}
      >
        {sessions.map((session, index) => (
          <SessionCard key={session.id} session={session} index={index} />
        ))}
      </div>

      {/* View All Link */}
      <Link
        href="/explore"
        className="mt-12 px-6 py-3 rounded-full border border-white/10 text-white/70 hover:text-white hover:border-white/30 transition-all hover:scale-105 flex items-center gap-2 relative z-10"
      >
        <span>View All Proofs</span>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      </Link>
    </section>
  );
}
