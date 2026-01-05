'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TrailPoint } from '@/types/session';

interface LightTrailProps {
  points: TrailPoint[];
  color?: string;
}

// Split points array into separate strokes at t=-1 boundary markers
export function splitIntoStrokes(points: TrailPoint[]): TrailPoint[][] {
  if (points.length === 0) return [];

  const strokes: TrailPoint[][] = [];
  let currentStroke: TrailPoint[] = [];

  for (const point of points) {
    if (point.t === -1) {
      // Marker found - save current stroke and start new one
      if (currentStroke.length >= 2) {
        strokes.push(currentStroke);
      }
      currentStroke = [];
    } else {
      currentStroke.push(point);
    }
  }

  // Don't forget the last stroke
  if (currentStroke.length >= 2) {
    strokes.push(currentStroke);
  }

  return strokes;
}

// Process points: filter duplicates and smooth
function processPoints(points: TrailPoint[]): TrailPoint[] {
  if (points.length < 2) return [];
  const uniquePoints: TrailPoint[] = [points[0]];
  let lastPoint = points[0];

  const radius = 0.02;
  const minDistance = radius * 0.5;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const dist = Math.sqrt(
      Math.pow(p.x - lastPoint.x, 2) +
        Math.pow(p.y - lastPoint.y, 2) +
        Math.pow(p.z - lastPoint.z, 2)
    );
    if (dist > minDistance) {
      uniquePoints.push(p);
      lastPoint = p;
    }
  }
  return uniquePoints;
}

// Single stroke renderer component
function StrokeRenderer({
  points,
  color,
}: {
  points: TrailPoint[];
  color: string;
}) {
  const processedPoints = useMemo(() => processPoints(points), [points]);

  const curve = useMemo(() => {
    if (processedPoints.length < 2) return null;
    const vectors = processedPoints.map(
      (p) => new THREE.Vector3(p.x, p.y, p.z)
    );
    return new THREE.CatmullRomCurve3(vectors);
  }, [processedPoints]);

  const geometry = useMemo(() => {
    if (!curve) return null;
    const tubularSegments = Math.min(processedPoints.length * 8, 2000);
    return new THREE.TubeGeometry(curve, tubularSegments, 0.02, 8, false);
  }, [curve, processedPoints.length]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#000000"
        emissive={new THREE.Color(color).multiplyScalar(10)}
        emissiveIntensity={0.5}
        toneMapped={false}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

export function LightTrail({
  points,
  color = '#7C3AED',
  autoRotate = false,
}: LightTrailProps & { autoRotate?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  // Split points into strokes (supports multi-stroke sessions)
  const strokes = useMemo(() => splitIntoStrokes(points), [points]);

  // Rotate slowly like the replay view (only if enabled)
  useFrame((state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  if (strokes.length === 0) return null;

  return (
    <group ref={groupRef}>
      {strokes.map((strokePoints, index) => (
        <StrokeRenderer key={index} points={strokePoints} color={color} />
      ))}
    </group>
  );
}

// Comet head - the glowing particle at cursor position
interface CometHeadProps {
  position: [number, number, number];
  color?: string;
  isActive?: boolean;
}

export function CometHead({
  position,
  color = '#7C3AED',
  isActive = false,
}: CometHeadProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const outerRef = useRef<THREE.Mesh>(null);
  const neonRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (meshRef.current && isActive) {
      const scale = 1 + Math.sin(time * 8) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
    if (glowRef.current && isActive) {
      const glowScale = 1.5 + Math.sin(time * 5) * 0.4;
      glowRef.current.scale.setScalar(glowScale);
    }
    if (outerRef.current && isActive) {
      const outerScale = 1 + Math.sin(time * 3) * 0.2;
      outerRef.current.scale.setScalar(outerScale);
    }
    if (neonRef.current && isActive) {
      const neonScale = 1 + Math.sin(time * 6 + 0.5) * 0.15;
      neonRef.current.scale.setScalar(neonScale);
    }
  });

  if (!isActive) return null;

  return (
    <group position={position}>
      {/* Outermost neon halo */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>
      {/* Wide neon glow */}
      <mesh ref={neonRef}>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Colored glow layer */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      {/* Core bright center */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export { SpaceBackground } from './space-background';

// Color palette for user selection
export const TRAIL_COLORS = [
  { name: 'Purple', value: '#A855F7' },
  { name: 'Cyan', value: '#22D3EE' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Yellow', value: '#FACC15' },
  { name: 'White', value: '#FFFFFF' },
];
