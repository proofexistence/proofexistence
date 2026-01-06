'use client';

import React, { useMemo, useRef, useEffect } from 'react';
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

  // Increased minimum distance to reduce point density for better performance
  const radius = 0.02;
  const minDistance = radius * 1.5;

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
  const geometryRef = useRef<THREE.TubeGeometry | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const curve = useMemo(() => {
    if (processedPoints.length < 2) return null;
    const vectors = processedPoints.map(
      (p) => new THREE.Vector3(p.x, p.y, p.z)
    );
    return new THREE.CatmullRomCurve3(vectors);
  }, [processedPoints]);

  const geometry = useMemo(() => {
    if (!curve) return null;
    // Reduced segments for better performance (was *8, cap 2000)
    const tubularSegments = Math.min(processedPoints.length * 4, 1000);
    return new THREE.TubeGeometry(curve, tubularSegments, 0.02, 6, false);
  }, [curve, processedPoints.length]);

  // Memoize emissive color to prevent re-creation every render
  const emissiveColor = useMemo(
    () => new THREE.Color(color).multiplyScalar(10),
    [color]
  );

  // Dispose old geometry when it changes
  useEffect(() => {
    // Dispose previous geometry if it exists and is different
    if (geometryRef.current && geometryRef.current !== geometry) {
      geometryRef.current.dispose();
    }
    geometryRef.current = geometry;
  }, [geometry]);

  // Cleanup on unmount
  useEffect(() => {
    const geo = geometryRef.current;
    const mat = materialRef.current;
    return () => {
      if (geo) {
        geo.dispose();
      }
      if (mat) {
        mat.dispose();
      }
    };
  }, []);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        ref={materialRef}
        color="#000000"
        emissive={emissiveColor}
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
      {/* Outermost neon halo - smaller & more transparent */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.05} depthWrite={false} />
      </mesh>
      {/* Wide neon glow */}
      <mesh ref={neonRef}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
      {/* Colored glow layer */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {/* Core bright center */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} />
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
