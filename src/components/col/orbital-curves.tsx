'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { AnimatedTrail } from './types';
import { COLOR_PALETTES } from './color-utils';

interface OrbitalCurvesProps {
  trails: AnimatedTrail[];
}

// Seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  random(min?: number, max?: number): number {
    this.seed = Math.sin(this.seed * 9999) * 10000;
    const r = this.seed - Math.floor(this.seed);
    if (min === undefined) return r;
    if (max === undefined) return r * min;
    return min + r * (max - min);
  }

  randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }
}

// All palettes
const ALL_PALETTES = [
  COLOR_PALETTES.pinkPurpleCyan,
  COLOR_PALETTES.warmOrange,
  COLOR_PALETTES.purpleBlue,
  COLOR_PALETTES.tealGreen,
  COLOR_PALETTES.lake,
  COLOR_PALETTES.grass,
  COLOR_PALETTES.pinkBlue,
];

// Floating particles component
function FloatingParticles({ count, seed }: { count: number; seed: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const rng = new SeededRandom(seed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Spread particles in outer sphere (background)
      const radius = rng.random(6, 15);
      const theta = rng.random(Math.PI * 2);
      const phi = Math.acos(2 * rng.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Soft white/gray colors
      const brightness = rng.random(0.3, 0.8);
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    return { positions, colors };
  }, [count, seed]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

// Single curve influenced by trail data
function TrailCurve({
  trail,
  index,
  totalTrails,
  baseSeed,
  palette,
  numPoints,
}: {
  trail: AnimatedTrail;
  index: number;
  totalTrails: number;
  baseSeed: number;
  palette: string[];
  numPoints: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const { curvePoints, color, rotationOffsets } = useMemo(() => {
    // Mix trail id with base seed for unique but consistent randomization
    const trailSeed = hashString(trail.id) + baseSeed;
    const rng = new SeededRandom(trailSeed);

    // Use trail's harmonized color or pick from palette
    const curveColor = trail.harmonizedColor || rng.randomChoice(palette);

    // Rotation offsets influenced by trail position
    const layerOffset = index / totalTrails;
    const rotationOffsets = {
      x: rng.random(Math.PI * 2) + layerOffset * 0.5,
      y: rng.random(Math.PI) + layerOffset * 0.3,
      z: rng.random(Math.PI / 2) + layerOffset * 0.2,
      xSpeed: rng.random(60, 100),
      ySpeed: rng.random(60, 100),
      zSpeed: rng.random(60, 100),
    };

    // Generate orbital points
    const points: THREE.Vector3[] = [];
    const radius = 3; // Fixed radius for cohesive look

    for (let i = 0; i < numPoints; i++) {
      const a = (Math.PI * 2 / numPoints) * i;

      // v_planet style calculation
      const divX = rng.random(3, 5);
      const divY = rng.random(3, 5);
      const baseX = (radius * Math.sin(a)) / divX;
      const baseY = (radius * Math.cos(a)) / divY;

      // Noise influenced by trail duration (longer trails = more variation)
      const noiseScale = Math.min(trail.duration / 60, 1) * 0.3 + 0.3;
      const d = rng.random(radius / 128, radius / 64) * noiseScale;
      // Reduced spread for more compact curves
      const xPlus = rng.random(-50, 50) / 8 + rng.random(-d, d);
      const yPlus = rng.random(-50, 50) / 8 + rng.random(-d, d);
      const zPlus = rng.random(-50, 50) / 8 + rng.random(-d, d);

      points.push(new THREE.Vector3(baseX + xPlus, baseY + yPlus, zPlus));
    }

    // Close loop
    if (points.length > 0) {
      points.push(points[0].clone());
    }

    // Create smooth curve and get points as [x,y,z] tuples for drei Line
    const curve = new THREE.CatmullRomCurve3(points, true);
    const smoothPoints = curve.getPoints(numPoints * 3);
    const curvePoints = smoothPoints.map((p) => [p.x, p.y, p.z] as [number, number, number]);

    return { curvePoints, color: curveColor, rotationOffsets };
  }, [trail, index, totalTrails, baseSeed, palette, numPoints]);

  // Animate rotation
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const q = index / totalTrails * 0.2;

      groupRef.current.rotation.x =
        rotationOffsets.x + time / 10 + q / rotationOffsets.xSpeed / 10;
      groupRef.current.rotation.y =
        rotationOffsets.y - time / 10 - q / rotationOffsets.ySpeed / 10;
      groupRef.current.rotation.z =
        rotationOffsets.z - time / 10 + q / rotationOffsets.zSpeed / 10;
    }
  });

  if (!trail.isVisible) return null;

  return (
    <group ref={groupRef}>
      <Line
        points={curvePoints}
        color={color}
        transparent
        opacity={0.75}
        lineWidth={1}
      />
    </group>
  );
}

// Hash string to number
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Main component
export function OrbitalCurves({ trails }: OrbitalCurvesProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate base seed from trails
  const baseSeed = useMemo(() => {
    if (trails.length === 0) return Math.random() * 1583;
    let hash = 0;
    const str = trails[0]?.id || 'default';
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 1583;
  }, [trails]);

  // Select palette based on seed
  const palette = useMemo(() => {
    const rng = new SeededRandom(baseSeed);
    return rng.randomChoice(ALL_PALETTES);
  }, [baseSeed]);

  // Number of points per curve
  const numPoints = useMemo(() => {
    const rng = new SeededRandom(baseSeed);
    return Math.floor(rng.random(45, 55));
  }, [baseSeed]);

  // Limit visible trails
  const visibleTrails = useMemo(() => {
    return trails.filter((t) => t.isVisible).slice(0, 60);
  }, [trails]);

  // Particle count based on trail count
  const particleCount = Math.min(visibleTrails.length * 5, 200);

  return (
    <group ref={groupRef}>
      {/* Floating particles background */}
      <FloatingParticles count={particleCount} seed={baseSeed} />

      {/* Trail-driven curves */}
      {visibleTrails.map((trail, index) => (
        <TrailCurve
          key={trail.id}
          trail={trail}
          index={index}
          totalTrails={visibleTrails.length}
          baseSeed={baseSeed}
          palette={palette}
          numPoints={numPoints}
        />
      ))}
    </group>
  );
}
