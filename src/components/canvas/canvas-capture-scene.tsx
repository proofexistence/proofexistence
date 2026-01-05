'use client';

import { useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { TrailPoint } from '@/types/session';
import { PerspectiveCamera } from '@react-three/drei';
import { SpaceBackground, splitIntoStrokes } from './light-trail';
import { ParticleSystem } from './particles';

// Reusing the exact visual style from ReplayCanvas
// Only differences: No OrbitControls (static camera), No Rotation, Fixed Auto-Focus

export function CaptureScene({
  points,
  color = '#A855F7',
}: {
  points: TrailPoint[];
  color?: string;
}) {
  return (
    <>
      <color attach="background" args={['#050508']} />
      <fog attach="fog" args={['#050508', 20, 80]} />
      <SpaceBackground starCount={800} />
      <ParticleSystem count={150} color={color} area={[30, 30, 30]} />
      <CaptureContent points={points} color={color} />
      <ambientLight intensity={0.5} />
    </>
  );
}

// Single stroke renderer for capture
function StrokeRenderer({
  points,
  tubeRadius,
  color,
}: {
  points: TrailPoint[];
  tubeRadius: number;
  color: string;
}) {
  // Process Points (Smoothing)
  const processedPoints = useMemo(() => {
    if (points.length < 2) return [];
    const uniquePoints: TrailPoint[] = [points[0]];
    let lastPoint = points[0];
    const minDistance = tubeRadius * 0.5;

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
  }, [points, tubeRadius]);

  // Generate Geometry
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
    return new THREE.TubeGeometry(curve, tubularSegments, tubeRadius, 8, false);
  }, [curve, processedPoints.length, tubeRadius]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#000000"
        emissive={new THREE.Color(color).multiplyScalar(8)}
        emissiveIntensity={0.5}
        toneMapped={false}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function CaptureContent({
  points,
  color,
}: {
  points: TrailPoint[];
  color?: string;
}) {
  const { viewport } = useThree();

  // Split points into strokes (supports multi-stroke sessions)
  const strokes = useMemo(() => splitIntoStrokes(points), [points]);

  // 1. Calculate Bounds & Center (excluding boundary markers)
  const bounds = useMemo(() => {
    // Filter out boundary markers (t === -1) for bounds calculation
    const actualPoints = points.filter((p) => p.t !== -1);

    if (actualPoints.length === 0) return { center: [0, 0, 0], radius: 10 };

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    actualPoints.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      maxZ = Math.max(maxZ, p.z);
    });

    const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
    const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

    return { center, radius };
  }, [points]);

  // 2. Fixed Tube Radius (Match LightTrail.tsx)
  const tubeRadius = 0.025;

  // 3. Auto-Position Camera
  const cameraZ = useMemo(() => {
    const fov = 60;
    const padding = 1.2;
    const aspect = viewport.aspect;
    const zoomFactor = aspect < 1 ? 1 / aspect : 1;

    const dist =
      (bounds.radius * 0.6 * padding * zoomFactor) /
      Math.tan((fov * Math.PI) / 360);

    return Math.max(10, dist);
  }, [bounds.radius, viewport.aspect]);

  if (strokes.length === 0) return null;

  return (
    <>
      <group
        position={
          [-bounds.center[0], -bounds.center[1], -bounds.center[2]] as [
            number,
            number,
            number,
          ]
        }
      >
        {strokes.map((strokePoints, index) => (
          <StrokeRenderer
            key={index}
            points={strokePoints}
            tubeRadius={tubeRadius}
            color={color || '#A855F7'}
          />
        ))}
      </group>

      {/* Locked Camera for Capture */}
      <PerspectiveCamera
        makeDefault
        position={[0, 0, cameraZ]}
        fov={60}
        near={0.1}
        far={cameraZ * 10}
      />
    </>
  );
}
