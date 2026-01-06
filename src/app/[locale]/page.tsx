'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ScrollDrawingCanvas } from '@/components/home/scroll-drawing-canvas';
import { TrailPoint } from '@/types/session';

// Lazy load heavy GSAP components
const AnimatedHero = dynamic(
  () =>
    import('@/components/home/animated-hero').then((mod) => mod.AnimatedHero),
  { ssr: false }
);

const AnimatedManifesto = dynamic(
  () =>
    import('@/components/home/animated-manifesto').then(
      (mod) => mod.AnimatedManifesto
    ),
  { ssr: false }
);

const AnimatedCTA = dynamic(
  () => import('@/components/home/animated-cta').then((mod) => mod.AnimatedCTA),
  { ssr: false }
);

interface Session {
  id: string;
  ipfsHash: string | null;
  trailData?: TrailPoint[] | null;
  color?: string | null;
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [drawingSession, setDrawingSession] = useState<Session | null>(null);

  // Fetch random sessions for both Hero (images) and Background (drawing)
  useEffect(() => {
    const controller = new AbortController();
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/sessions/random', {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const validSessions = data.sessions || [];
        setSessions(validSessions);

        // Pick a session with trail data for the background animation
        const withTrails = validSessions.filter(
          (s: Session) =>
            s.trailData && (s.trailData as TrailPoint[]).length > 20
        );
        if (withTrails.length > 0) {
          setDrawingSession(withTrails[0]);
        }
      } catch {
        // Ignore
      }
    };
    fetchSession();
    return () => controller.abort();
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-transparent text-white overflow-x-hidden selection:bg-purple-500/30">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-20%] w-[90%] h-[50%] md:top-[-20%] md:left-[-10%] md:w-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[90%] h-[60%] md:bottom-[-10%] md:right-[-10%] md:w-[40%] bg-cyan-900/10 blur-[100px] rounded-full mix-blend-screen animate-[pulse_10s_ease-in-out_infinite_reverse]" />
      </div>

      {/* Global Scroll Drawing - Fixed Background */}
      {drawingSession && drawingSession.trailData && (
        <ScrollDrawingCanvas
          points={drawingSession.trailData}
          color={drawingSession.color || '#7E44DB'}
          className="fixed top-0 left-0 right-0 bottom-[400px] z-0 opacity-30 pointer-events-none"
          start="100vh top"
          end="bottom bottom"
          triggerSelector="body"
        />
      )}

      <div className="relative z-10 flex flex-col">
        {/* SECTION 1: ANIMATED HERO with floating session images */}
        <AnimatedHero sessions={sessions} />

        {/* SECTION 2: MANIFESTO SECTIONS */}
        <AnimatedManifesto />

        {/* SECTION 3: FINAL CTA */}
        <AnimatedCTA />
      </div>
    </div>
  );
}
