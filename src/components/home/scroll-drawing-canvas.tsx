'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { TrailPoint } from '@/types/session';
import { LightTrail, CometHead } from '@/components/canvas/light-trail';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ScrollDrawingCanvasProps {
  points: TrailPoint[];
  color?: string;
  className?: string;
  triggerSelector?: string;
  start?: string;
  end?: string;
}

function Scene({
  points,
  color,
  triggerSelector,
  start,
  end,
}: {
  points: TrailPoint[];
  color?: string;
  triggerSelector?: string;
  start?: string;
  end?: string;
}) {
  const [visiblePoints, setVisiblePoints] = useState<TrailPoint[]>([]);
  const progressRef = useRef(0);

  // Setup ScrollTrigger to drive progress
  useEffect(() => {
    // Default: trigger on body/viewport, start after hero (approx 100vh), end after some scrolls
    // If triggerSelector is provided, use that.
    const triggerTarget = triggerSelector || 'body';

    const trigger = ScrollTrigger.create({
      trigger: triggerTarget,
      start: start || 'top top',
      end: end || '+=2000', // Extend the scroll distance for a slower draw
      scrub: 1.5,
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });

    return () => {
      trigger.kill();
    };
  }, [triggerSelector, start, end]);

  // Update visible points based on progress
  useFrame(() => {
    if (points.length < 2) return;

    const targetIndex = Math.floor(points.length * progressRef.current);
    const count = Math.max(0, targetIndex);

    if (count !== visiblePoints.length) {
      const safeCount = Math.min(count, points.length);
      if (safeCount >= 2) {
        setVisiblePoints(points.slice(0, safeCount));
      } else {
        setVisiblePoints([]);
      }
    }
  });

  const headPosition = useMemo(() => {
    if (visiblePoints.length === 0)
      return points[0]
        ? ([points[0].x, points[0].y, points[0].z] as [number, number, number])
        : ([0, 0, 0] as [number, number, number]);
    const last = visiblePoints[visiblePoints.length - 1];
    return [last.x, last.y, last.z] as [number, number, number];
  }, [visiblePoints, points]);

  if (visiblePoints.length < 2) return null;

  return (
    <>
      <ambientLight intensity={0.5} />
      <LightTrail points={visiblePoints} color={color} autoRotate={false} />
      <CometHead position={headPosition} color={color} isActive={true} />
    </>
  );
}

export function ScrollDrawingCanvas({
  points,
  color = '#7E44DB',
  className,
  triggerSelector,
  start,
  end,
}: ScrollDrawingCanvasProps) {
  // Normalize points to fit within the view
  const normalizedPoints = useMemo(() => {
    if (!points || points.length === 0) return [];

    // 1. Find bounding box
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    points.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    // const depth = maxZ - minZ;

    // 2. Calculate center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // 3. Determine scale factor
    // Target size: ~18 units tall/wide to fit comfortably in view (camera z=20, fov=45 => visible height ~16)
    const maxDim = Math.max(width, height);
    const TARGET_SIZE = 18;
    const scale = maxDim > 0 ? TARGET_SIZE / maxDim : 1;

    // 4. Transform points
    return points.map((p) => ({
      ...p,
      x: (p.x - centerX) * scale,
      y: (p.y - centerY) * scale - 2, // Shift down by 2 units to center visually
      z: (p.z - centerZ) * scale, // Optional: flatten Z if desired, but keeping 3D structure is usually better
    }));
  }, [points]);

  if (!normalizedPoints || normalizedPoints.length === 0) return null;

  return (
    <div className={`absolute inset-0 z-0 pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 45 }} // Centered but zoomed out to fit within reduced height
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <Scene
          points={normalizedPoints}
          color={color}
          triggerSelector={triggerSelector}
          start={start}
          end={end}
        />
      </Canvas>
    </div>
  );
}
