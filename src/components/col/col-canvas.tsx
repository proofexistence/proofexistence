'use client';

import { useState, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';

import { useColTrails } from '@/hooks/use-col-trails';
import { harmonizeColor } from './color-utils';
import { OrbitalCurves } from './orbital-curves';
import { TimelineControls } from './timeline-controls';
import {
  getTimeRangeDuration,
  type ColTrail,
  type AnimatedTrail,
  type TimeRange,
} from './types';

import { SpaceBackground } from '@/components/canvas/light-trail';

interface ColCanvasProps {
  initialTrails: ColTrail[];
  initialTimeRange: { start: string; end: string };
}

const MAX_TRAILS = 200;

// Scene content
function SceneContent({ trails }: { trails: AnimatedTrail[] }) {
  return (
    <>
      <color attach="background" args={['#202020']} />
      <fog attach="fog" args={['#202020', 20, 60]} />

      <SpaceBackground starCount={300} />

      <OrbitalCurves trails={trails} />

      <ambientLight intensity={0.2} />

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
          intensity={1.2}
        />
      </EffectComposer>
    </>
  );
}

export function ColCanvas({ initialTrails, initialTimeRange }: ColCanvasProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1y');
  const [startDate, setStartDate] = useState(new Date(initialTimeRange.start));
  const [endDate, setEndDate] = useState(new Date(initialTimeRange.end));

  // Fetch trails
  const { data, isLoading, isFetching } = useColTrails({
    range: timeRange,
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

  const handleTimeRangeChange = useCallback((newRange: TimeRange) => {
    const duration = getTimeRangeDuration(newRange);
    const now = new Date();
    setTimeRange(newRange);
    setEndDate(now);
    setStartDate(new Date(now.getTime() - duration));
  }, []);

  return (
    <div className="relative w-full h-full bg-[#202020]">
      {/* 3D Canvas */}
      <Canvas
        gl={{
          toneMapping: THREE.NoToneMapping,
          alpha: false,
          antialias: true,
        }}
        className="w-full h-full"
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
            <div>此時間範圍內沒有軌跡</div>
            <div className="text-xs mt-1">嘗試選擇其他時間範圍</div>
          </div>
        </div>
      )}

      {/* Stats - top left */}
      <div className="absolute top-4 left-4 text-white/20 text-[10px] font-mono z-10">
        {trails.length} trails
      </div>

      {/* Title - top right */}
      <div className="absolute top-4 right-4 text-white/30 text-xs font-mono z-10">
        Collective Art
      </div>

      {/* Time Range Controls */}
      <TimelineControls
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        trailCount={trails.length}
        isLoading={isLoading || isFetching}
      />
    </div>
  );
}
