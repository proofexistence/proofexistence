'use client';

import { useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TrailPoint } from '@/types/session';
import { PerspectiveCamera } from '@react-three/drei';
import { SpaceBackground } from './light-trail';
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

function CaptureContent({
  points,
  color,
}: {
  points: TrailPoint[];
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // 1. Calculate Bounds & Center
  const bounds = useMemo(() => {
    if (points.length === 0)
      return { center: [0, 0, 0], radius: 10, maxDim: 10 };

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    points.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      maxZ = Math.max(maxZ, p.z);
    });

    const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
    // Radius encompassing the object
    const radius = Math.max(maxX - minX, maxY - minY, maxZ - minZ);

    return { center, radius, minX, maxX, minY, maxY };
  }, [points]);

  // 2. Fixed Tube Radius (Match LightTrail.tsx)
  const tubeRadius = 0.025; // Fixed world-unit radius

  // 3. Process Points (Smoothing)
  const processedPoints = useMemo(() => {
    if (points.length < 2) return [];
    const uniquePoints: TrailPoint[] = [points[0]];
    let lastPoint = points[0];
    // Match LightTrail smoothing logic
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

  // 4. Generate Geometry
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

  // 5. Auto-Position Camera
  const cameraZ = useMemo(() => {
    const fov = 60; // Must match the camera prop below
    const padding = 1.2; // 20% padding around the object

    // Aspect ratio adjustment for mobile/portrait
    // Since we crop to a square, if viewport is portrait (width < height),
    // the width is the limiting factor for the crop.
    const aspect = viewport.aspect;
    const zoomFactor = aspect < 1 ? 1 / aspect : 1;

    // Calculate distance needed to fit the radius within FOV, adjusting for minimal dimension
    const dist =
      (bounds.radius * 0.6 * padding * zoomFactor) /
      Math.tan((fov * Math.PI) / 360);

    return Math.max(10, dist); // Minimum distance
  }, [bounds.radius, viewport.aspect]);

  if (!geometry) return null;

  return (
    <>
      <group
        position={
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [-bounds.center[0], -bounds.center[1], -bounds.center[2]] as any
        }
      >
        <mesh ref={meshRef} geometry={geometry}>
          <meshStandardMaterial
            color="#000000"
            emissive={new THREE.Color(color || '#A855F7').multiplyScalar(8)}
            emissiveIntensity={0.5}
            toneMapped={false}
            transparent
            opacity={0.8}
          />
        </mesh>
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
