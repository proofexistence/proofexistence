'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useColTrails } from '@/hooks/use-col-trails';
import { harmonizeColor } from './color-utils';
import { OrbitalCurves } from './orbital-curves';
import { TimelineControls } from './timeline-controls';
import {
  getDateRange,
  navigateDate,
  type ColTrail,
  type AnimatedTrail,
  type TimeGranularity,
} from './types';

interface ColCanvasProps {
  initialTrails: ColTrail[];
}

const MAX_TRAILS = 200;

// Scene content
function SceneContent({ trails }: { trails: AnimatedTrail[] }) {
  return (
    <>
      <OrbitalCurves trails={trails} />

      <ambientLight intensity={0.3} />

      <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={50} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        minDistance={5}
        maxDistance={30}
      />

      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur
          intensity={1.5}
        />
      </EffectComposer>
    </>
  );
}

export function ColCanvas({ initialTrails }: ColCanvasProps) {
  const t = useTranslations('col');
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(600);
  const [granularity, setGranularity] = useState<TimeGranularity>('day');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate date range based on granularity
  const { start: startDate, end: endDate } = useMemo(
    () => getDateRange(currentDate, granularity),
    [currentDate, granularity]
  );

  // Calculate canvas size based on container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resize = () => {
      const containerRect = container.getBoundingClientRect();
      const availableWidth = containerRect.width - 32;
      const availableHeight = containerRect.height - 120; // Space for controls
      const maxSize = Math.min(availableWidth, availableHeight);
      const size = Math.max(Math.min(maxSize, 900), 200);
      setCanvasSize(size);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Fetch trails
  const { data, isLoading, isFetching } = useColTrails({
    startDate,
    endDate,
  });

  const trails = useMemo(() => {
    const rawTrails = data?.trails || initialTrails;
    return rawTrails.slice(0, MAX_TRAILS);
  }, [data?.trails, initialTrails]);

  // All trails visible (no playback)
  const animatedTrails = useMemo((): AnimatedTrail[] => {
    return trails.map((trail) => ({
      ...trail,
      growthProgress: 1,
      isVisible: true,
      harmonizedColor: harmonizeColor(trail.color),
    }));
  }, [trails]);

  const handleDateChange = useCallback(
    (direction: 'prev' | 'next') => {
      setCurrentDate((prev) => navigateDate(prev, granularity, direction));
    },
    [granularity]
  );

  const handleGranularityChange = useCallback((newGranularity: TimeGranularity) => {
    setGranularity(newGranularity);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center"
    >
      {/* Centered Square Canvas */}
      <div
        className="relative rounded-lg overflow-hidden"
        style={{
          width: canvasSize,
          height: canvasSize,
        }}
      >
        <Canvas
          gl={{
            toneMapping: THREE.NoToneMapping,
            alpha: true,
            antialias: true,
          }}
          style={{ width: canvasSize, height: canvasSize, background: 'transparent' }}
        >
          <SceneContent trails={animatedTrails} />
        </Canvas>

        {/* Loading overlay */}
        {(isLoading || isFetching) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
            <Loader2 className="w-8 h-8 animate-spin text-white/40" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isFetching && trails.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-white/30 text-sm text-center">
              <div>{t('emptyState.title')}</div>
              <div className="text-xs mt-1">{t('emptyState.subtitle')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Controls - outside canvas at bottom */}
      <div className="w-full max-w-3xl px-4 pt-4 pb-2">
        {/* Time Range Controls */}
        <TimelineControls
          currentDate={currentDate}
          granularity={granularity}
          onDateChange={handleDateChange}
          onDateSelect={handleDateSelect}
          onGranularityChange={handleGranularityChange}
          trailCount={trails.length}
          isLoading={isLoading || isFetching}
        />
      </div>
    </div>
  );
}
